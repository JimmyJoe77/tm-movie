// =============================================================================
// API CONFIGURATION - TMDB API Key v3 + French-Stream Source
// =============================================================================
var TMDB_API_KEY = "5e515caadf8d52a665cf230e3676ee63";
var FRENCH_STREAM_DOMAIN = "https://french-stream.one";
var DEBUG = true;  // Set to true for debugging
var LAST_SEARCH_TITLE = "";  // Track original title for matching in parseDetailResponse (CALL 2)
var LAST_MEDIA_TYPE = "movie";  // Track media type (movie or tv) for detail fetching

function getManifest() {
  return JSON.stringify({
    id: "tmdb",
    name: "TMDB",
    version: "1.0.0",
    baseUrl: "https://api.themoviedb.org/3/",
    iconUrl:
      "https://raw.githubusercontent.com/JimmyJoe77/tm-movie/main/plugins/tmdb.ico",
    isEnabled: true,
    isAdult: false,
    type: "MOVIE",
  });
}

function getHomeSections() {
  return JSON.stringify([
    {
      slug: "movie/popular",
      title: "Movies Popular",
      type: "Horizontal",
      path: "",
    },
    {
      slug: "tv/popular",
      title: "TV Shows Popular",
      type: "Horizontal",
      path: "",
    },
    {
      slug: "movie/top_rated",
      title: "Top Rated Movies",
      type: "Horizontal",
      path: "",
    },
    {
      slug: "movie/upcoming",
      title: "Upcoming Movies",
      type: "Horizontal",
      path: "",
    },
    {
      slug: "discover/movie?with_genres=16",
      title: "Animation",
      type: "Horizontal",
      path: "",
    },
    {
      slug: "discover/movie?with_genres=28",
      title: "Action",
      type: "Horizontal",
      path: "",
    },
    {
      slug: "discover/movie",
      title: "Movies you may like",
      type: "Grid",
      path: "",
    },
  ]);
}

function getPrimaryCategories() {
  return JSON.stringify([
    { id: "28", slug: "Action" },
    { id: "12", slug: "Adventure" },
    { id: "16", slug: "Animation" },
    { id: "35", slug: "Comedy" },
    { id: "80", slug: "Crime" },
    { id: "99", slug: "Documentary" },
    { id: "18", slug: "Drama" },
    { id: "10751", slug: "Family" },
    { id: "14", slug: "Fantasy" },
    { id: "36", slug: "History" },
    { id: "27", slug: "Horror" },
    { id: "10402", slug: "Music" },
    { id: "9648", slug: "Mystery" },
    { id: "10749", slug: "Romance" },
    { id: "878", slug: "Science Fiction" },
    { id: "10770", slug: "TV Movie" },
    { id: "53", slug: "Thriller" },
    { id: "10752", slug: "War" },
    { id: "37", slug: "Western" },
  ]);
}

function getFilterConfig() {
  return JSON.stringify({
    sortBy: [
      { id: "popularity.desc", name: "Popularity Descending" },
      { id: "popularity.asc", name: "Popularity Ascending" },
      { id: "revenue.desc", name: "Revenue Descending" },
      { id: "revenue.asc", name: "Revenue Ascending" },
      { id: "primary_release_date.desc", name: "Release Date Newest" },
      { id: "primary_release_date.asc", name: "Release Date Oldest" },
      { id: "vote_average.desc", name: "Rating Highest" },
      { id: "vote_average.asc", name: "Rating Lowest" },
      { id: "vote_count.desc", name: "Vote Count Descending" },
      { id: "vote_count.asc", name: "Vote Count Ascending" },
      { id: "original_title.asc", name: "Title (A-Z)" },
      { id: "original_title.desc", name: "Title (Z-A)" },
    ],
    releaseYear: [
      { id: 2024, name: "2024" },
      { id: 2023, name: "2023" },
      { id: 2022, name: "2022" },
      { id: 2021, name: "2021" },
      { id: 2020, name: "2020" },
      { id: 2019, name: "2019" },
      { id: 2018, name: "2018" },
      { id: 2017, name: "2017" },
      { id: 2016, name: "2016" },
      { id: 2015, name: "2015" },
    ],
    voteAverage: [
      { id: "8", name: "8.0+" },
      { id: "7", name: "7.0+" },
      { id: "6", name: "6.0+" },
      { id: "5", name: "5.0+" },
    ],
  });
}

// =============================================================================
// URL GENERATION — Group 2: Generate URLs
// =============================================================================

function getUrlList(slug, filtersJson) {
  try {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;

    var url = "https://api.themoviedb.org/3/" + slug;
    var separator = slug.indexOf("?") !== -1 ? "&" : "?";
    url += separator + "api_key=" + TMDB_API_KEY;
    url += "&page=" + page;

    // Apply genre filter if slug is a genre ID
    if (slug && slug.match(/^\d+$/)) {
      url += "&with_genres=" + slug;
    }

    // Apply release year filter
    if (filters.year) {
      url += "&primary_release_year=" + filters.year;
    }

    // Apply vote average filter
    if (filters.voteAverage) {
      url += "&vote_average.gte=" + filters.voteAverage;
    }

    // Apply rating filter
    if (filters.rating) {
      url += "&vote_average.gte=" + filters.rating;
    }

    return url;
  } catch (e) {
    return (
      "https://api.themoviedb.org/3/discover/movie?api_key=" +
      TMDB_API_KEY +
      "&page=1&sort_by=popularity.desc"
    );
  }
}

function getUrlSearch(keyword, filtersJson) {
  try {
    var filters = JSON.parse(filtersJson || "{}");
    var page = filters.page || 1;
    var language = filters.language || "en-US";

    var url = "https://api.themoviedb.org/3/search/movie";
    url += "?api_key=" + TMDB_API_KEY;
    url += "&query=" + encodeURIComponent(keyword);
    url += "&page=" + page;
    url += "&language=" + language;
    url += "&include_adult=false";

    return url;
  } catch (e) {
    return (
      "https://api.themoviedb.org/3/search/movie?api_key=" +
      TMDB_API_KEY +
      "&query=" +
      encodeURIComponent(keyword)
    );
  }
}

function getUrlDetail(slug) {
  // slug can be:
  // 1. movie/TV ID (numeric string) - when user clicks from list → fetch TMDB detail
  // 2. movie/TV title (string with type marker) - when user clicks Play → search on french-stream
  //    Format: "Title(Year)~TYPE" where TYPE is "movie" or "tv"
  
  try {
    // Check if slug is a numeric ID
    if (/^\d+$/.test(slug)) {
      // ✅ MODE 1 (CALL 1): TMDB MODE - Fetch movie/TV detail from TMDB
      if (DEBUG) {
        // Log: [CALL 1] Fetching TMDB detail for ID: slug (using type: LAST_MEDIA_TYPE)
      }
      
      // Use the media type to call the correct endpoint
      var mediaType = LAST_MEDIA_TYPE || "movie";
      var url = "https://api.themoviedb.org/3/" + mediaType + "/" + slug;
      url += "?api_key=" + TMDB_API_KEY;
      url += "&language=en-US";
      url += "&append_to_response=credits";  // Get credits for both movie and TV
      
      return url;
    }
    
    // ✅ MODE 2 (CALL 2): SEARCH MODE - Search on french-stream with title
    if (DEBUG) {
      // Log: [CALL 2] Searching french-stream for title: slug
    }
    
    // Parse type marker from slug format: "Title(Year)~TYPE"
    var mediaTypeMarker = "movie";  // Default
    var titleForSearch = slug;
    
    var typeMatch = slug.match(/~(movie|tv)$/);
    if (typeMatch) {
      mediaTypeMarker = typeMatch[1];
      titleForSearch = slug.replace(/~(movie|tv)$/, "");  // Remove type marker
    }
    
    // Extract year if present (format: "Title(2024)")
    var year = 0;
    var titleOnly = titleForSearch;
    
    var yearMatch = titleForSearch.match(/\((\d{4})\)/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
      titleOnly = titleForSearch.replace(/\s*\(\d{4}\)\s*$/, "");
    }
    
    // Prepare search query: lowercase, URL encode, replace %20 with +
    var searchQuery = titleOnly.toLowerCase();
    searchQuery = encodeURIComponent(searchQuery);
    searchQuery = searchQuery.replace(/%20/g, "+");
    
    // For TV shows, append type hint to search
    if (mediaTypeMarker === "tv") {
      searchQuery = searchQuery + "+serie";  // Add "serie" hint for TV shows
    }
    
    // Build French-Stream search URL
    var searchUrl = FRENCH_STREAM_DOMAIN + "/?story=" + searchQuery + "&do=search&subaction=search";
    
    // Store original title for CALL 2 matching (title similarity scoring in parseDetailResponse)
    LAST_SEARCH_TITLE = titleOnly;
    
    if (DEBUG) {
      // Log: [CALL 2] Searching French-Stream for: titleOnly (type: mediaTypeMarker)
      // Log: Search URL: searchUrl
    }
    
    return searchUrl;
  } catch (e) {
    if (DEBUG) {
      // Log: Error in getUrlDetail: e.toString()
    }
    // Fallback: return TMDB discover
    return "https://api.themoviedb.org/3/discover/movie?api_key=" + TMDB_API_KEY + "&page=1";
  }
}

function getUrlCategories() {
  return (
    "https://api.themoviedb.org/3/genre/movie/list?api_key=" +
    TMDB_API_KEY +
    "&language=en-US"
  );
}

// Helper function to get API headers for requests
function getApiHeaders() {
  return {
    accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://www.themoviedb.org/",
    "Accept-Language": "en-US,en;q=0.9",
  };
}

// =============================================================================
// PARSERS — Group 3: Data Processing (⭐ Most Important)
// =============================================================================

function parseListResponse(apiResponseJson) {
  try {
    var response = JSON.parse(apiResponseJson);
    var results = response.results || [];
    var page = response.page || 1;
    var totalPages = response.total_pages || 1;
    var totalResults = response.total_results || 0;

    var movies = results.map(function (item) {
      return {
        id: String(item.id),
        title: item.title || item.name || "Unknown",
        posterUrl: item.poster_path
          ? "https://image.tmdb.org/t/p/w500" + item.poster_path
          : "",
        backdropUrl: item.backdrop_path
          ? "https://image.tmdb.org/t/p/w1280" + item.backdrop_path
          : "",
        description: item.overview || "",
        year: item.release_date
          ? parseInt(item.release_date.substring(0, 4), 10)
          : 0,
        quality: "",
        episode_current: "",
        lang: "",
      };
    });

    return JSON.stringify({
      items: movies,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalResults,
        itemsPerPage: results.length,
      },
    });
  } catch (e) {
    return JSON.stringify({
      items: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 0,
      },
    });
  }
}

function parseSearchResponse(apiResponseJson) {
  // Search API returns same format as discover, so reuse parser
  return parseListResponse(apiResponseJson);
}

function parseMovieDetail(apiResponseJson) {
  // ============================================================================
  // CALL 1️⃣: DISPLAY MOVIE DETAILS FROM TMDB (METADATA & SERVERS)
  // ============================================================================
  // Input: JSON response from TMDB API (either movie or TV show)
  // Output: Movie/TV metadata (title, poster, description, servers, episodes)
  //
  // Tasks:
  // 1. Extract: title, poster, backdrop, description, rating
  // 2. Extract: credits (cast, directors), genres
  // 3. Detect whether response is MOVIE or TV SHOW (by checking for number_of_seasons)
  // 4. Create servers array with play button
  // 5. episodeId = "Title(Year)~TYPE" → use for CALL 2 search
  // 6. App displays metadata & user clicks "Play" → trigger CALL 2
  
  try {
    var movie = JSON.parse(apiResponseJson);

    if (DEBUG) {
      // Log: [CALL 1] Parsing movie detail for: movie.title
      // Log: Movie ID: movie.id (for debugging)
    }
    
    // Detect if this is a TV show or movie
    // TV shows have: number_of_seasons, number_of_episodes, first_air_date
    // Movies have: release_date, runtime, revenue
    var isTV = !!(movie.number_of_seasons || movie.number_of_episodes);
    var mediaType = isTV ? "tv" : "movie";
    
    // Store media type for use in getUrlDetail
    LAST_MEDIA_TYPE = mediaType;

    // Extract cast info
    var casts = "";
    if (movie.credits && movie.credits.cast) {
      casts = movie.credits.cast
        .slice(0, 5)
        .map(function (actor) {
          return actor.name;
        })
        .join(", ");
    }

    // Extract directors
    var directors = "";
    if (movie.credits && movie.credits.crew) {
      var directorsList = movie.credits.crew.filter(function (crew) {
        return crew.job === "Director";
      });
      directors = directorsList
        .map(function (d) {
          return d.name;
        })
        .join(", ");
    }

    // Extract genres
    var genres = "";
    if (movie.genres) {
      genres = movie.genres
        .map(function (g) {
          return g.name;
        })
        .join(", ");
    }

    // Extract videos (trailer)
    var videos = [];
    if (movie.videos && movie.videos.results) {
      var trailer = movie.videos.results.find(function (v) {
        return v.type === "Trailer" && v.site === "YouTube";
      });
      if (trailer) {
        videos.push({
          name: "Trailer",
          url: "https://www.youtube.com/watch?v=" + trailer.key,
        });
      }
    }

    // Build episode title with year for better matching
    var releaseYear = 0;
    if (isTV && movie.first_air_date) {
      releaseYear = parseInt(movie.first_air_date.substring(0, 4), 10);
    } else if (!isTV && movie.release_date) {
      releaseYear = parseInt(movie.release_date.substring(0, 4), 10);
    }
    
    // Create episodeId with type marker: "Title(Year)~TYPE"
    // This helps getUrlDetail know whether to call /movie/ or /tv/ endpoint
    var episodeId = movie.title || (isTV ? movie.name : "Unknown");
    if (releaseYear > 0) {
      episodeId = episodeId + "(" + releaseYear + ")~" + mediaType;
    } else {
      episodeId = episodeId + "~" + mediaType;
    }

    var episodes = [];
    var servers = [];

    // Create server with episode to trigger play action
    // episode.id will be passed to getUrlDetail() as the movie/tv title for search
    if (movie.id) {
      servers.push({
        name: "Watch Now",
        episodes: [
          {
            id: episodeId,  // This includes type marker for proper endpoint routing
            name: isTV ? "Watch Series" : "Play Movie",
            slug: "stream",
          },
        ],
      });
    }

    if (DEBUG) {
      // Log: Created episode ID for search: episodeId (type: mediaType)
    }

    return JSON.stringify({
      id: String(movie.id),
      title: movie.title || movie.name || "Unknown",
      originName: movie.original_title || movie.original_name || "",
      posterUrl: movie.poster_path
        ? "https://image.tmdb.org/t/p/w500" + movie.poster_path
        : "",
      backdropUrl: movie.backdrop_path
        ? "https://image.tmdb.org/t/p/w1280" + movie.backdrop_path
        : "",
      description: movie.overview || "",
      year: releaseYear,
      rating: movie.vote_average || 0,
      quality: "",
      duration: isTV 
        ? (movie.number_of_seasons || 0) + " seasons, " + (movie.number_of_episodes || 0) + " episodes"
        : (movie.runtime || 0) + " min",
      servers: servers,
      episode_current: isTV ? ("Season 1" || "") : "",
      lang: "",
      category: genres,
      country: isTV
        ? (movie.origin_country ? movie.origin_country.join(", ") : "")
        : (movie.origin_country ? movie.origin_country.join(", ") : ""),
      director: directors,
      casts: casts,
      status: movie.status || (isTV ? "Ongoing" : "Released"),
      videos: videos,
      isTV: isTV,  // Include flag for app to handle differently if needed
      mediaType: mediaType,
    });
  } catch (e) {
    if (DEBUG) {
      // Log: Error parsing movie detail: e.toString()
    }
    return JSON.stringify({
      id: "",
      title: "Error parsing movie",
      posterUrl: "",
      servers: [],
      rating: 0,
      error: true,
    });
  }
}

// ============================================================================= 
// HELPER: URL Extraction from Packed/Eval Code
// =============================================================================

function extractUrlsFromEvalCode(html) {
  // Try to extract URLs from eval(function(p,a,c,k,e,d){...}) packed code
  // Returns array of vidzy URLs found
  var urls = [];
  
  try {
    // Pattern 1: Find src:"..." containing vidzy URLs directly
    // Works for both packed and unpacked code
    var srcPattern = /src:\s*["']([^"']*https:\/\/u\d+\.vidzy\.live\/hls2\/[^"']*master\.m3u8[^"']*?)["']/g;
    var match;
    
    while ((match = srcPattern.exec(html)) !== null) {
      if (match[1]) {
        urls.push(match[1]);
      }
    }
    
    // Pattern 2: If not found via src, try to locate eval block and extract
    if (urls.length === 0) {
      // Look for eval(function pattern
      var evalMatch = html.match(/eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*d\s*\)([\s\S]{0,50000}?)\}\s*\(/);
      
      if (evalMatch) {
        var evalContent = evalMatch[1];
        // Extract src patterns from packed code
        var innerSrcPattern = /src["\']?\s*:\s*["\']([^"']*vidzy[^"']*master\.m3u8[^"']*)/g;
        while ((match = innerSrcPattern.exec(evalContent)) !== null) {
          if (match[1]) {
            urls.push(match[1]);
          }
        }
      }
    }
    
    // Cleanup URLs - remove extra quotes/escapes
    urls = urls.map(function(url) {
      return url.replace(/[\\"']/g, '').trim();
    });
    
    if (DEBUG) {
      // Log: Found vidzy URLs in eval code: urls.length
    }
    
    return urls;
  } catch (e) {
    if (DEBUG) {
      // Log: Error extracting URLs from eval: e.toString()
    }
    return [];
  }
}

// ============================================================================= 
// HELPER: String Similarity Matching (for LẦN 2: Title Matching)
// =============================================================================

function calculateSimilarity(str1, str2) {
  // Simple similarity score 0.0-1.0 (Jaccard + case-insensitive)
  // Used to find best-matching movie from search results
  try {
    var s1 = str1.toLowerCase().trim();
    var s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;  // Perfect match
    
    // Split into words
    var words1 = s1.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(function(w) { return w.length > 0; });
    var words2 = s2.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(function(w) { return w.length > 0; });
    
    // Calculate Jaccard similarity
    var intersection = 0;
    var union = {};
    
    for (var i = 0; i < words1.length; i++) {
      union[words1[i]] = true;
    }
    for (var j = 0; j < words2.length; j++) {
      union[words2[j]] = true;
      if (words1.indexOf(words2[j]) !== -1) {
        intersection++;
      }
    }
    
    var unionSize = Object.keys(union).length;
    var score = unionSize > 0 ? intersection / unionSize : 0;
    
    return score;
  } catch (e) {
    return 0;
  }
}

function parseDetailResponse(html, originalTitle) {
  // ============================================================================
  // CALL 2️⃣: FIND MATCHING MOVIE ON FRENCH-STREAM
  // ============================================================================
  // Input: HTML from French-Stream search page + originalTitle from TMDB
  // Output: URL of best-matching movie for fetching details
  // 
  // Strategy:
  // 1. Extract all search results from HTML
  // 2. Compare title of each result with originalTitle (using calculateSimilarity)
  // 3. Select result with highest match score
  // 4. Return movie detail URL (for CALL 3: parseEmbedResponse to extract video)
  
  try {
    // Use LAST_SEARCH_TITLE if originalTitle not provided
    var titleForMatching = originalTitle || LAST_SEARCH_TITLE;
    
    if (DEBUG) {
      // Log: [CALL 2] Starting title matching with: titleForMatching
    }
    
    // Extract all .short elements (movie results)
    // Pattern: <div class="short">...<a class="short-poster" href="...">...</a>...<p class="short-title">Title</p>...</div>
    var shortPattern = /<div\s+class="short"[^>]*>([\s\S]*?)<\/div>/g;
    var shortMatches;
    var items = [];
    
    while ((shortMatches = shortPattern.exec(html)) !== null) {
      var shortHtml = shortMatches[1];
      
      // Extract href from .short-poster
      var hrefMatch = shortHtml.match(/class="short-poster"[^>]*href="([^"]+)"/);
      if (!hrefMatch) continue;
      var href = hrefMatch[1];
      
      // Extract title from .short-title
      var titleMatch = shortHtml.match(/class="short-title"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
      if (!titleMatch) {
        titleMatch = shortHtml.match(/class="short-title"[^>]*>([^<]+)</);
      }
      if (!titleMatch) continue;
      var title = titleMatch[1].trim();
      
      items.push({
        href: href,
        title: title
      });
    }
    
    if (DEBUG) {
      // Log: [CALL 2] Found items.length search results
    }
    
    // MATCHING: Compare titles and select best match
    if (items.length > 0) {
      var bestMatch = items[0];
      var bestScore = 0;
      
      // If titleForMatching exists, use it for matching
      if (titleForMatching && titleForMatching.length > 0) {
        for (var i = 0; i < items.length; i++) {
          var score = calculateSimilarity(titleForMatching, items[i].title);
          if (DEBUG) {
            // Log: items[i].title " -> similarity score: " + score
          }
          if (score > bestScore) {
            bestScore = score;
            bestMatch = items[i];
          }
        }
      }
      
      if (DEBUG) {
        // Log: [CALL 2] Selected best match: bestMatch.title (score: bestScore.toFixed(2))
      }
      
      // Clear LAST_SEARCH_TITLE after use
      LAST_SEARCH_TITLE = "";
      
      return JSON.stringify({
        url: bestMatch.href,
        isEmbed: true,  // Fetch this URL and parse with parseEmbedResponse (CALL 3)
        headers: { "Referer": FRENCH_STREAM_DOMAIN }
      });
    }
    
    // No items found
    LAST_SEARCH_TITLE = "";
    return JSON.stringify({
      url: "",
      headers: { "Referer": FRENCH_STREAM_DOMAIN },
      isEmbed: false
    });
  } catch (e) {
    if (DEBUG) {
      // Log: [CALL 2] Error in parseDetailResponse
    }
    LAST_SEARCH_TITLE = "";
    return JSON.stringify({
      url: "",
      headers: { "Referer": FRENCH_STREAM_DOMAIN },
      isEmbed: false
    });
  }
}

function parseEmbedResponse(html, sourceUrl) {
  // ============================================================================
  // CALL 3️⃣: EXTRACT VIDEO LINK FROM MOVIE DETAIL PAGE
  // ============================================================================
  // Input: HTML from movie detail page on French-Stream
  // Output: Video URL + headers for app playback
  //
  // Strategy:
  // 1. Search all regex patterns to find video link
  // 2. Priority: Vidzy HLS > iframe > <source> > Direct URL
  // 3. Extract headers: Referer, Origin, User-Agent
  // 4. Return URL + headers + mimeType
  
  try {
    // Pattern -1: Try to extract from eval(function(p,a,c,k,e,d){...}) packed code FIRST
    // This handles videojs player code with src embedded in HTML
    if (DEBUG) {
      // Log: [CALL 3] Starting embed response parsing, checking for eval code
    }
    
    var extractedUrls = extractUrlsFromEvalCode(html);
    if (extractedUrls && extractedUrls.length > 0) {
      if (DEBUG) {
        // Log: [CALL 3] Found URL in eval code: extractedUrls[0]
      }
      return JSON.stringify({
        url: extractedUrls[0],
        headers: { 
          "Referer": sourceUrl,
          "Origin": "https://vidzy.live",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        isEmbed: false,
        mimeType: "application/x-mpegURL"
      });
    }
    
    if (DEBUG) {
      // Log: [CALL 3] No URL in eval code, trying direct patterns
    }
    
    // Pattern 0: Vidzy.live HLS master playlist (priority)
    // Looks for: https://u14.vidzy.live/hls2/.../master.m3u8?...
    var vidzyMatch = html.match(/(https:\/\/u\d+\.vidzy\.live\/hls2\/[^"'\s]+master\.m3u8[^"'\s]*)/);
    if (vidzyMatch && vidzyMatch[1]) {
      if (DEBUG) {
        // Log: [CALL 3] Found Vidzy HLS URL (direct pattern)
      }
      return JSON.stringify({
        url: vidzyMatch[1],
        headers: { 
          "Referer": sourceUrl,
          "Origin": "https://vidzy.live",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        isEmbed: false,
        mimeType: "application/x-mpegURL"
      });
    }
    
    // Try to extract iframe src
    var iframeMatch = html.match(/\<iframe[^>]*src=["']([^"']+)["'][^>]*\>/);
    if (iframeMatch && iframeMatch[1]) {
      var iframeUrl = iframeMatch[1];
      
      // If iframe points to another player, we need to fetch it
      // For now, return it with isEmbed: true to fetch again
      if (iframeUrl.indexOf(sourceUrl) === -1) {
        if (DEBUG) {
          // Log: [CALL 3] Found iframe URL (embedded player)
        }
        return JSON.stringify({
          url: iframeUrl,
          isEmbed: true,
          headers: { "Referer": sourceUrl }
        });
      }
    }
    
    // Try to extract video source URL patterns
    // Pattern 1: <source src="...m3u8" type="application/x-mpegURL">
    var sourceMatch = html.match(/\<source[^>]*src=["']([^"']+\.m3u8[^"']*)/);
    if (sourceMatch && sourceMatch[1]) {
      if (DEBUG) {
        // Log: [CALL 3] Found source tag m3u8
      }
      return JSON.stringify({
        url: sourceMatch[1],
        headers: { "Referer": sourceUrl },
        isEmbed: false,
        mimeType: "application/x-mpegURL"
      });
    }
    
    // Pattern 2: Direct video URL in various formats
    var videoMatch = html.match(/["']((https?:\/\/)?[^"']*\.(mp4|m3u8|mkv|webm)[^"']*)["\']/i);
    if (videoMatch && videoMatch[1]) {
      var videoUrl = videoMatch[1];
      var isHls = videoUrl.indexOf(".m3u8") !== -1;
      
      if (DEBUG) {
        // Log: [CALL 3] Found direct video URL (Pattern 2)
      }
      return JSON.stringify({
        url: videoUrl,
        headers: { "Referer": sourceUrl, "User-Agent": "Mozilla/5.0" },
        isEmbed: false,
        mimeType: isHls ? "application/x-mpegURL" : ""
      });
    }
    
    // Pattern 3: JavaScript embedded player data
    var playerMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
    if (playerMatch && playerMatch[1]) {
      var playerUrl = playerMatch[1];
      var isHls2 = playerUrl.indexOf(".m3u8") !== -1;
      
      if (DEBUG) {
        // Log: [CALL 3] Found player data file URL (Pattern 3)
      }
      return JSON.stringify({
        url: playerUrl,
        headers: { "Referer": sourceUrl },
        isEmbed: false,
        mimeType: isHls2 ? "application/x-mpegURL" : ""
      });
    }
    
    if (DEBUG) {
      // Log: [CALL 3] No video URL found - returning empty
    }
    
    return JSON.stringify({
      url: "",
      headers: { "Referer": sourceUrl },
      isEmbed: false
    });
  } catch (e) {
    if (DEBUG) {
      // Log: [CALL 3] Error parsing embed response: e.toString()
    }
    return JSON.stringify({
      url: "",
      isEmbed: false
    });
  }
}

function parseCategoriesResponse(apiResponseJson) {
  try {
    var response = JSON.parse(apiResponseJson);
    var genres = response.genres || [];

    return JSON.stringify(
      genres.map(function (g) {
        return { id: String(g.id), name: g.name };
      }),
    );
  } catch (e) {
    return JSON.stringify([]);
  }
}
