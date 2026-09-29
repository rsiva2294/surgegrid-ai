"""
scripts/download_missing_media.py

Paginates the TANGEDCO_Offcl UserMedia timeline via the authenticated Twitter 
GraphQL API. Downloads only images that are NOT already present in Firestore 
(i.e., individual notices). The remaining images are the "abstract reports" 
that the production scraper intentionally skipped.

Date range: 01-Jul-2026 to 28-Sep-2026

Usage:
    python scripts/download_missing_media.py

Requires:
    pip install requests
"""

import requests
import json
import os
import sys
import time
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# ──────────────────────── Config ────────────────────────
def _require_env(name):
    value = os.environ.get(name, '').strip()
    if not value:
        sys.exit(f'ERROR: environment variable {name} is not set (see scripts/README.md).')
    return value


BEARER = _require_env('X_BEARER_TOKEN')
CT0 = _require_env('X_CT0')
AUTH_TOKEN = _require_env('X_AUTH_TOKEN')

USER_ID = '1548918713302532096'  # @TANGEDCO_Offcl
MEDIA_QID = 'GEs4r5bWKm0P0EIRfo2DGw'  # UserMedia GraphQL query ID

# Date boundaries (UTC)
DATE_START = datetime(2026, 7, 1, tzinfo=timezone.utc)
DATE_END = datetime(2026, 9, 29, tzinfo=timezone.utc)  # inclusive of Sep 28

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
MANIFEST_PATH = PROJECT_ROOT / 'scratch' / 'tneb_image_manifest.json'
OUTPUT_DIR = PROJECT_ROOT / 'data' / 'tneb_abstract_reports'
LOG_PATH = PROJECT_ROOT / 'data' / 'download_missing_media.log'

ITEMS_PER_PAGE = 20
REQUEST_DELAY = 2.0  # seconds between pagination requests
DOWNLOAD_TIMEOUT = 30

# ──────────────────────── Feature flags (required by GraphQL) ────────────────────────
FEATURES = {
    'rweb_tipjar_consumption_enabled': True,
    'responsive_web_graphql_exclude_directive_enabled': True,
    'verified_phone_label_enabled': False,
    'creator_subscriptions_tweet_preview_api_enabled': True,
    'responsive_web_graphql_timeline_navigation_enabled': True,
    'responsive_web_graphql_skip_user_profile_image_extensions_enabled': False,
    'communities_web_enable_tweet_community_results_fetch': True,
    'c9s_tweet_anatomy_moderator_badge_enabled': True,
    'articles_preview_enabled': True,
    'responsive_web_edit_tweet_api_enabled': True,
    'graphql_is_translatable_rweb_tweet_is_translatable_enabled': True,
    'view_counts_everywhere_api_enabled': True,
    'longform_notetweets_consumption_enabled': True,
    'responsive_web_twitter_article_tweet_consumption_enabled': True,
    'tweet_awards_web_tipping_enabled': False,
    'creator_subscriptions_quote_tweet_preview_enabled': False,
    'freedom_of_speech_not_reach_fetch_enabled': True,
    'standardized_nudges_misinfo': True,
    'tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled': True,
    'rweb_video_timestamps_enabled': True,
    'longform_notetweets_rich_text_read_enabled': True,
    'longform_notetweets_inline_media_enabled': True,
    'responsive_web_enhance_cards_enabled': False,
}


def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line)
    with open(LOG_PATH, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def normalize_media_key(url):
    """Extract the unique media key from a pbs.twimg.com URL.
    
    Examples:
        https://pbs.twimg.com/media/HM2z3sraUAAUwY3.jpg  →  HM2z3sraUAAUwY3
        https://pbs.twimg.com/media/HM2z3sraUAAUwY3?format=jpg&name=orig  →  HM2z3sraUAAUwY3
    """
    parsed = urlparse(url)
    basename = os.path.basename(parsed.path)
    # Strip extension
    key = os.path.splitext(basename)[0]
    return key


def load_known_media_keys():
    """Load all image URLs from the Firestore manifest and return their media keys."""
    if not MANIFEST_PATH.exists():
        log(f'WARNING: Manifest not found at {MANIFEST_PATH}')
        return set()
    
    with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    keys = set()
    for entry in manifest:
        url = entry.get('image_url', '')
        if url:
            keys.add(normalize_media_key(url))
    
    log(f'Loaded {len(keys)} known media keys from Firestore manifest')
    return keys


def parse_twitter_date(date_str):
    """Parse Twitter's created_at format: 'Mon Sep 28 09:44:21 +0000 2026'"""
    try:
        return datetime.strptime(date_str, '%a %b %d %H:%M:%S %z %Y')
    except (ValueError, TypeError):
        return None


def build_session():
    """Build an authenticated requests session."""
    session = requests.Session()
    session.headers.update({
        'authorization': f'Bearer {BEARER}',
        'x-csrf-token': CT0,
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-active-user': 'yes',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    session.cookies.update({
        'auth_token': AUTH_TOKEN,
        'ct0': CT0,
    })
    return session


def fetch_user_media(session, cursor=None):
    """Fetch one page of the UserMedia timeline."""
    variables = {
        'userId': USER_ID,
        'count': ITEMS_PER_PAGE,
        'includePromotedContent': False,
        'withClientEventToken': False,
        'withBirdwatchNotes': False,
        'withVoice': True,
        'withV2Timeline': True,
    }
    if cursor:
        variables['cursor'] = cursor
    
    params = {
        'variables': json.dumps(variables),
        'features': json.dumps(FEATURES),
    }
    
    resp = session.get(
        f'https://x.com/i/api/graphql/{MEDIA_QID}/UserMedia',
        params=params,
        timeout=30
    )
    
    if resp.status_code == 429:
        log('Rate limited — waiting 60 seconds...')
        time.sleep(60)
        return fetch_user_media(session, cursor)
    
    resp.raise_for_status()
    return resp.json()


def extract_media_from_response(data):
    """Parse the GraphQL response to extract media items and the pagination cursor.
    
    Returns:
        media_items: list of dicts with {tweet_id, created_at, media_url, media_key, text}
        bottom_cursor: str or None
        oldest_date: datetime or None (the oldest tweet date in this page)
    """
    media_items = []
    bottom_cursor = None
    oldest_date = None
    
    instructions = (data.get('data', {})
        .get('user', {})
        .get('result', {})
        .get('timeline', {})
        .get('timeline', {})
        .get('instructions', []))
    
    for inst in instructions:
        inst_type = inst.get('type', '')
        
        # Page 1: TimelineAddEntries with TimelineTimelineModule entries
        if inst_type == 'TimelineAddEntries':
            entries = inst.get('entries', [])
            for entry in entries:
                entry_id = entry.get('entryId', '')
                content = entry.get('content', {})
                
                if 'cursor-bottom' in entry_id:
                    bottom_cursor = content.get('value', '')
                    continue
                if 'cursor-top' in entry_id:
                    continue
                
                # TimelineTimelineModule with items array
                items = content.get('items', [])
                for item in items:
                    ic = item.get('item', {}).get('itemContent', {})
                    _extract_from_item_content(ic, media_items)
                
                # Also check direct itemContent (single tweet entries)
                ic = content.get('itemContent', {})
                if ic and ic.get('tweet_results'):
                    _extract_from_item_content(ic, media_items)
        
        # Page 2+: TimelineAddToModule appends items to existing module
        elif inst_type == 'TimelineAddToModule':
            module_items = inst.get('moduleItems', [])
            for mi in module_items:
                ic = mi.get('item', {}).get('itemContent', {})
                _extract_from_item_content(ic, media_items)
    
    # Determine oldest date
    for mi in media_items:
        dt = parse_twitter_date(mi['created_at'])
        if dt and (oldest_date is None or dt < oldest_date):
            oldest_date = dt
    
    return media_items, bottom_cursor, oldest_date


def _extract_from_item_content(ic, media_items):
    """Extract media from a single tweet itemContent."""
    tr = ic.get('tweet_results', {})
    result = tr.get('result', {})
    typename = result.get('__typename', '')
    
    if typename == 'TweetWithVisibilityResults':
        result = result.get('tweet', {})
    
    if not result:
        return
    
    legacy = result.get('legacy', {})
    tweet_id = legacy.get('id_str', result.get('rest_id', ''))
    created_at = legacy.get('created_at', '')
    full_text = legacy.get('full_text', '')
    
    extended = legacy.get('extended_entities', {})
    for m in extended.get('media', []):
        url = m.get('media_url_https', '')
        if url and '/media/' in url:  # Skip video thumbnails etc
            media_items.append({
                'tweet_id': tweet_id,
                'created_at': created_at,
                'media_url': url,
                'media_key': normalize_media_key(url),
                'text': full_text[:120],
            })


def download_image(session, url, dest_path):
    """Download an image from Twitter CDN."""
    # Request highest resolution
    try:
        dl_url = url
        if '?' not in url:
            dl_url = f'{url}?format=jpg&name=orig'
        
        resp = session.get(dl_url, timeout=DOWNLOAD_TIMEOUT, stream=True)
        if resp.status_code != 200:
            # Fallback to raw URL
            resp = session.get(url, timeout=DOWNLOAD_TIMEOUT, stream=True)
        
        resp.raise_for_status()
        
        with open(dest_path, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return True
    except Exception as e:
        log(f'  Download error: {e}')
        if dest_path.exists():
            dest_path.unlink()
        return False


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    log('=' * 60)
    log('TANGEDCO Abstract Report Downloader')
    log(f'Date range: {DATE_START.date()} to {DATE_END.date()}')
    log(f'Output: {OUTPUT_DIR}')
    log('=' * 60)
    
    # Load known images from Firestore
    known_keys = load_known_media_keys()
    
    session = build_session()
    
    cursor = None
    page = 0
    total_seen = 0
    total_in_range = 0
    total_new = 0
    total_downloaded = 0
    total_skipped_known = 0
    reached_boundary = False
    
    all_new_items = []
    
    consecutive_empty = 0
    MAX_CONSECUTIVE_EMPTY = 5  # Re-auth after this many empties
    MAX_TOTAL_EMPTY = 15       # Give up after this many total consecutive empties
    
    while not reached_boundary:
        page += 1
        log(f'\n--- Page {page} (cursor: {"start" if not cursor else cursor[:40] + "..."}) ---')
        
        try:
            data = fetch_user_media(session, cursor)
        except requests.exceptions.HTTPError as e:
            log(f'HTTP Error: {e}')
            if e.response and e.response.status_code == 401:
                log('Auth token expired — please update X_CT0 and X_AUTH_TOKEN')
            break
        except Exception as e:
            log(f'Fetch error: {e}')
            break
        
        media_items, bottom_cursor, oldest_date = extract_media_from_response(data)
        total_seen += len(media_items)
        
        if not media_items:
            consecutive_empty += 1
            log(f'No media items found on this page (empty streak: {consecutive_empty})')
            
            if consecutive_empty >= MAX_TOTAL_EMPTY:
                log(f'Giving up after {MAX_TOTAL_EMPTY} consecutive empty pages')
                break
            
            if bottom_cursor:
                cursor = bottom_cursor
                time.sleep(REQUEST_DELAY)
                continue
            else:
                log('No more pages — end of timeline')
                break
        else:
            consecutive_empty = 0  # Reset on success
        
        log(f'Found {len(media_items)} media items')
        if oldest_date:
            log(f'Oldest tweet on this page: {oldest_date.strftime("%Y-%m-%d %H:%M")}')
        
        for item in media_items:
            dt = parse_twitter_date(item['created_at'])
            
            # Skip tweets outside our date range (future)
            if dt and dt > DATE_END:
                continue
            
            # Stop if we've gone past our date boundary
            if dt and dt < DATE_START:
                log(f'Reached boundary: {dt.strftime("%Y-%m-%d")} < {DATE_START.date()}')
                reached_boundary = True
                break
            
            total_in_range += 1
            
            # Check if this image is already in Firestore
            if item['media_key'] in known_keys:
                total_skipped_known += 1
                continue
            
            total_new += 1
            all_new_items.append(item)
            
            # Download immediately
            date_str = dt.strftime('%Y-%m-%d') if dt else 'unknown'
            safe_id = re.sub(r'[^a-zA-Z0-9_-]', '_', item['tweet_id'])
            filename = f'{date_str}_{safe_id}_{item["media_key"]}.jpg'
            dest = OUTPUT_DIR / filename
            
            if dest.exists() and dest.stat().st_size > 2048:
                log(f'  Already downloaded: {filename}')
                total_downloaded += 1
                continue
            
            success = download_image(session, item['media_url'], dest)
            if success:
                total_downloaded += 1
                size_kb = dest.stat().st_size // 1024
                log(f'  NEW #{total_new}: {filename} ({size_kb} KB)')
            else:
                log(f'  FAILED: {filename}')
        
        if not bottom_cursor:
            log('No pagination cursor — reached end of timeline')
            break
        
        cursor = bottom_cursor
        time.sleep(REQUEST_DELAY)
    
    # Save manifest of new items
    new_manifest_path = OUTPUT_DIR / 'new_media_manifest.json'
    with open(new_manifest_path, 'w', encoding='utf-8') as f:
        json.dump(all_new_items, f, indent=2, ensure_ascii=False)
    
    log('\n' + '=' * 60)
    log('Download Complete!')
    log(f'Total media seen:         {total_seen}')
    log(f'In date range:            {total_in_range}')
    log(f'Already in Firestore:     {total_skipped_known}')
    log(f'New (abstract reports):   {total_new}')
    log(f'Successfully downloaded:  {total_downloaded}')
    log(f'New items manifest:       {new_manifest_path}')
    log(f'Output directory:         {OUTPUT_DIR}')
    log('=' * 60)


if __name__ == '__main__':
    main()
