// =============================================================================
// API CONFIGURATION - TMDB API Key v3
// =============================================================================
var TMDB_API_KEY = "5e515caadf8d52a665cf230e3676ee63";

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
  // slug here is now movie TITLE (from episode.id in parseMovieDetail)
  // We search Ophim API by title to find the movie, then fetch its detail
  
  // Check if slug contains ophim detail indicator (:/)
  if (slug.indexOf("ophim:") === 0) {
    // This is already an Ophim slug - fetch detail directly
    var ophimSlug = slug.substring(6);
    return "https://ophim1.com/v1/api/phim/" + ophimSlug;
  }
  
  // Otherwise, treat as movie title - search Ophim
  return "https://ophim1.com/v1/api/tim-kiem?keyword=" + encodeURIComponent(slug);
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
  try {
    var movie = JSON.parse(apiResponseJson);

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

    // TMDB does not provide direct stream links
    // Episodes are fake list from episode IDs to trigger app calling getUrlDetail
    var episodes = [];
    var servers = [];

    // Create fake episodes with movie TITLE to trigger search on Ophim
    // episode.id will be passed to getUrlDetail() as the search keyword
    if (movie.title) {
      servers.push({
        name: "Watch Now",
        episodes: [
          {
            id: movie.title || "Unknown",  // Movie title as search keyword
            name: "Play Movie",
            slug: "stream",
          },
        ],
      });
    }

    var releaseYear = parseInt(
      movie.release_date ? movie.release_date.substring(0, 4) : 0,
      10,
    );

    return JSON.stringify({
      id: String(movie.id),
      title: movie.title || "Unknown",
      originName: movie.original_title || "",
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
      duration: (movie.runtime || 0) + " min",
      servers: servers,
      episode_current: "",
      lang: "",
      category: genres,
      country: movie.origin_country ? movie.origin_country.join(", ") : "",
      director: directors,
      casts: casts,
      status: movie.status || "",
      videos: videos,
    });
  } catch (e) {
    return JSON.stringify({
      id: "",
      title: "Error",
      posterUrl: "",
      servers: [],
      rating: 0,
    });
  }
}

function parseDetailResponse(html) {
  // This function handles:
  // 1. Ophim search response (GET /tim-kiem) - extract slug from first result
  // 2. Ophim detail response (GET /phim/{slug}) - extract video link
  try {
    var response = JSON.parse(html);
    
    // Case 1: Search response from Ophim - contains array of movies
    if (response.data && response.data.items && response.data.items.length > 0) {
      // Found movie in Ophim - now fetch its detail page to get video links
      var firstMovie = response.data.items[0];
      var ophimSlug = firstMovie.slug;
      
      // Return detail URL with isEmbed: true to fetch again and parse
      return JSON.stringify({
        url: "https://ophim1.com/v1/api/phim/" + ophimSlug,
        isEmbed: true,  // Tell app to fetch this URL and call parseEmbedResponse()
        headers: { "Referer": "https://ophim1.com" }
      });
    }
    
    // Case 2: Detail response from Ophim - contains movie with episodes
    if (response.movie || response.data) {
      var movie = response.movie || response.data.item || {};
      var episodes = response.episodes || response.data.item.episodes || [];
      
      // Extract first video link from first server
      var streamUrl = "";
      if (episodes.length > 0) {
        var firstServer = episodes[0];
        if (firstServer.server_data && firstServer.server_data.length > 0) {
          streamUrl = firstServer.server_data[0].link_m3u8 || firstServer.server_data[0].link_embed || "";
        }
      }
      
      return JSON.stringify({
        url: streamUrl,
        headers: { "Referer": "https://ophim1.com", "User-Agent": "Mozilla/5.0" },
        subtitles: [],
        isEmbed: false,  // Final stream URL
        mimeType: streamUrl.indexOf(".m3u8") !== -1 ? "application/x-mpegURL" : ""
      });
    }
    
    // No data found
    return JSON.stringify({
      url: "",
      headers: { "Referer": "https://ophim1.com" },
      isEmbed: false
    });
  } catch (e) {
    return JSON.stringify({
      url: "",
      headers: { "Referer": "https://ophim1.com" },
      isEmbed: false
    });
  }
}

function parseEmbedResponse(html, sourceUrl) {
  // This is called when parseDetailResponse() returns isEmbed: true
  // We receive Ophim detail page response and extract the actual video link
  try {
    var response = JSON.parse(html);
    var movie = response.movie || response.data.item || {};
    var episodes = response.episodes || response.data.item.episodes || [];
    
    // Extract first video link
    var streamUrl = "";
    if (episodes.length > 0) {
      var firstServer = episodes[0];
      if (firstServer.server_data && firstServer.server_data.length > 0) {
        streamUrl = firstServer.server_data[0].link_m3u8 || firstServer.server_data[0].link_embed || "";
      }
    }
    
    return JSON.stringify({
      url: streamUrl,
      headers: { "Referer": "https://ophim1.com", "User-Agent": "Mozilla/5.0" },
      subtitles: [],
      isEmbed: false,  // Final stream link
      mimeType: streamUrl.indexOf(".m3u8") !== -1 ? "application/x-mpegURL" : ""
    });
  } catch (e) {
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
