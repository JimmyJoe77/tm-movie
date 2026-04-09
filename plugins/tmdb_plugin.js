// =============================================================================
// TMDB Plugin cho nền tảng VAAPP - Cập nhật lõi cào link Vidsrc Mạng VIP (Không giật lag)
// Trích xuất trực tiếp M3U8 Stream 100% bằng Javascript (Không cần WebView/Captcha)
// =============================================================================

var TMDB_API_KEY = "5e515caadf8d52a665cf230e3676ee63";
var BASE_URL = "https://api.themoviedb.org/3";
var IMG_BASE_URL = "https://image.tmdb.org/t/p/w500";
// Chuyển sang tiếng anh để tên phim chuẩn khớp với data Vidsrc
var LANG = "en-US"; 

var VIDSRC_DOMAIN = "https://vidsrc.net";

function getManifest() {
    return JSON.stringify({
        "id": "tmdb_xpass",
        "name": "Phim TMDB Cao Cấp",
        "version": "1.3.0",
        "baseUrl": BASE_URL,
        "type": "video",
        "author": "Antigravity",
        "description": "Nguồn phim quốc tế TMDB, lấy link M3U8 trực tiếp từ Xpass siêu tốc không quảng cáo"
    });
}

function getHomeSections() {
    return JSON.stringify([
        { slug: "movie_popular", title: "Phim Lẻ Phổ Biến" },
        { slug: "tv_popular", title: "Phim Bộ Phổ Biến" },
        { slug: "movie_now_playing", title: "Phim Lẻ Đang Chiếu" },
        { slug: "tv_on_the_air", title: "Phim Bộ Đang Chiếu" },
        { slug: "movie_top_rated", title: "Top Phim Lẻ" },
        { slug: "tv_top_rated", title: "Top Phim Bộ" }
    ]);
}

function getUrlList(slug, filtersJson) {
    var page = JSON.parse(filtersJson || "{}").page || 1;
    var url = "";

    if (slug === "movie_popular") url = "/movie/popular";
    else if (slug === "tv_popular") url = "/tv/popular";
    else if (slug === "movie_now_playing") url = "/movie/now_playing";
    else if (slug === "tv_on_the_air") url = "/tv/on_the_air";
    else if (slug === "movie_top_rated") url = "/movie/top_rated";
    else if (slug === "tv_top_rated") url = "/tv/top_rated";
    
    if (!url) return "";
    return BASE_URL + url + buildParams(page);
}

function getUrlSearch(keyword, filtersJson) {
    var page = JSON.parse(filtersJson || "{}").page || 1;
    return BASE_URL + "/search/multi" + buildParams(page) + "&query=" + encodeURIComponent(keyword);
}

function buildParams(page) {
    return "?api_key=" + TMDB_API_KEY + "&language=" + LANG + "&page=" + page;
}

function parseListResponse(html) {
    try {
        var obj = JSON.parse(html);
        var items = [];
        var resItems = obj.results || [];
        for (var i = 0; i < resItems.length; i++) {
            var item = resItems[i];
            var type = item.media_type; 
            
            if (!type) {
                type = (item.first_air_date !== undefined || item.name !== undefined) ? "tv" : "movie";
            }
            if (type !== "movie" && type !== "tv") continue;

            var dateRaw = item.release_date || item.first_air_date;
            var year = dateRaw ? dateRaw.split("-")[0] : "N/A";

            items.push({
                id: type + "|" + item.id,
                title: item.title || item.name,
                posterUrl: item.poster_path ? IMG_BASE_URL + item.poster_path : "",
                backdropUrl: item.backdrop_path ? IMG_BASE_URL + item.backdrop_path : "",
                type: type === "movie" ? "MOVIE" : "TV SERIES",
                lang: item.original_language ? item.original_language.toUpperCase() : "EN",
                year: year,
                episode_current: item.vote_average ? "⭐ " + item.vote_average.toFixed(1) : "?",
                description: item.overview || "Đang cập nhật nội dung..."
            });
        }
        return JSON.stringify({
            items: items,
            pagination: {
                currentPage: obj.page,
                totalPages: obj.total_pages
            }
        });
    } catch (e) {
        return JSON.stringify({ items: [] });
    }
}

// =====================================================================
// BƯỚC 1: ROUTING BẤM VÀO PHIM LẤY THÔNG TIN VÀ CHUYỂN HƯỚNG TỚI VIDSRC
// =====================================================================
function getUrlDetail(slug) {
    var parts = slug.split("|");
    var prefix = parts[0];

    // NẾU TÍN HIỆU ĐẾN TỪ NÚT XEM PHIM Ở APP: Bắn tới trang Xpass!
    if (prefix === "xpass_tv") {
        return "https://play.xpass.top/e/tv/" + parts[1] + "/" + parts[2] + "/" + parts[3];
    }
    if (prefix === "xpass_movie") {
        return "https://play.xpass.top/e/movie/" + parts[1];
    }

    // NẾU LÀ GIAI ĐOẠN LẤY THÔNG TIN FILM (Cào metadata từ TMDB trước khi xem)
    if (prefix === "tv" || prefix === "movie") {
        return BASE_URL + "/" + prefix + "/" + parts[1] + "?api_key=" + TMDB_API_KEY + "&language=" + LANG + "&append_to_response=videos,credits";
    }

    return "";
}

function parseMovieDetail(html) {
    try {
        var json = JSON.parse(html);
        if (json.id) {
            var title = json.title || json.name;
            var original = json.original_title || json.original_name;
            var finalTitle = title !== original ? title + " (" + original + ")" : title;
            
            var servers = [];
            var cast = "";
            var catList = [];
            var director = "";

            if (json.genres) {
                for (var i = 0; i < json.genres.length; i++) catList.push(json.genres[i].name);
            }
            if (json.credits && json.credits.crew) {
                for (var j = 0; j < json.credits.crew.length; j++) {
                    if (json.credits.crew[j].job === "Director") {
                        director = json.credits.crew[j].name;
                        break;
                    }
                }
            }

            var dateRaw = json.release_date || json.first_air_date;
            var year = dateRaw ? dateRaw.split("-")[0] : "N/A";
            var duration = json.runtime || (json.episode_run_time ? json.episode_run_time[0] : 0) || 0;

            // Nếu đây là cấu trúc phim bộ -> Chia season và tập
            if (json.seasons && json.seasons.length > 0) {
                cast = (json.credits && json.credits.cast) ? json.credits.cast.slice(0, 5).map(function(c) { return c.name; }).join(", ") : "";
                for (var s = 0; s < json.seasons.length; s++) {
                    var season = json.seasons[s];
                    if (season.season_number > 0) {
                        var eps = [];
                        for (var i = 1; i <= season.episode_count; i++) {
                            eps.push({
                                // Gửi kèm title để getServers dùng Search
                                id: "xpass_tv|" + json.id + "|" + season.season_number + "|" + i + "|" + encodeURIComponent(finalTitle),
                                name: "Tập " + i,
                                slug: season.season_number + "_" + i
                            });
                        }
                        servers.push({
                            name: "Phần " + season.season_number,
                            episodes: eps
                        });
                    }
                }
            } else {
                cast = (json.credits && json.credits.cast) ? json.credits.cast.slice(0, 5).map(function(c) { return c.name; }).join(", ") : "";
                // Phim lẻ 
                servers.push({
                    name: "Nguồn VIP - Xpass",
                    episodes: [{
                        // Gửi kèm title
                        id: "xpass_movie|" + json.id + "|" + encodeURIComponent(finalTitle),
                        name: "Full HD",
                        slug: "full"
                    }]
                });
            }
            
            return JSON.stringify({
                title: finalTitle,
                description: json.overview,
                backdropUrl: json.backdrop_path ? IMG_BASE_URL + json.backdrop_path : "",
                posterUrl: json.poster_path ? IMG_BASE_URL + json.poster_path : "",
                year: year,
                quality: "HD",
                status: json.status || "Full",
                rating: json.vote_average ? json.vote_average.toFixed(1) : "?",
                duration: duration ? duration + " Phút" : "N/A",
                category: catList.length > 0 ? catList.join(", ") : "N/A",
                director: director || "N/A",
                casts: cast || "N/A",
                servers: servers, 
                headers: {},
                isEmbed: true 
            });
        }
    } catch(e) {}
    return JSON.stringify({ title: "Không tải được dữ liệu", servers: [] });
}

function parseDetailResponse(html) {
    // Giai đoạn: Người dùng đã bấm Xem Phim Tập N -> HTML này là giao diện web Xpass
    var playlistMatch = html.match(/"playlist"\s*:\s*"([^"]+)"/i);
    if (playlistMatch) {
        var playlistUrl = "https://play.xpass.top" + playlistMatch[1];
        return JSON.stringify({ 
            // Trả về url playlist.json, VAAPP sẽ tiếp tục Fetch đệ quy cái url này qua parseEmbedResponse
            url: playlistUrl, 
            isEmbed: true 
        });
    }
    return JSON.stringify({url: ""});
}

function parseEmbedResponse(html, url) { 
    // Giai đoạn: Nhận HTML (hoặc JSON) từ nguồn chi tiết

    // 1. Nếu là nguồn Ophim fallback (Ophim detail JSON)
    if (url && url.indexOf("ophim1.com/v1/api/phim/") !== -1) {
        try {
            var data = JSON.parse(html);
            var epIndex = 1;
            // Trích xuất ?ep= từ url
            if (url.indexOf("?ep=") !== -1) {
                epIndex = parseInt(url.split("?ep=")[1]);
            }
            
            var streamUrl = "";
            var rawEpisodes = data.episodes || (data.data && data.data.item && data.data.item.episodes) || [];
            
            if (rawEpisodes.length > 0) {
                var serverData = rawEpisodes[0].server_data;
                if (serverData && serverData.length > 0) {
                    // Tìm tập theo tên hoặc theo index
                    var epData = serverData[0]; // Mặc định tập 1
                    for (var j = 0; j < serverData.length; j++) {
                        if (serverData[j].name === epIndex.toString() || serverData[j].name.toLowerCase() === "full") {
                            epData = serverData[j];
                            break;
                        }
                    }
                    
                    streamUrl = epData.link_m3u8 || epData.link_embed || "";
                }
            }
            
            return JSON.stringify({
                url: streamUrl,
                headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://ophim1.com" },
                subtitles: [],
                isEmbed: false
            });
        } catch(e) {}
    }

    // 2. Nếu là nguồn Xpass playlist (Xpass JSON)
    try {
        var json = JSON.parse(html);
        if (json.playlist && json.playlist.length > 0) {
            var sources = json.playlist[0].sources;
            if (sources && sources.length > 0) {
                var streamUrl = sources[0].file;
                
                // M3U8 CHUẨN! Trả về cho Native Video Player
                return JSON.stringify({ 
                    url: streamUrl, 
                    headers: { "Referer": "https://play.xpass.top/", "Origin": "https://play.xpass.top" },
                    subtitles: [],
                    isEmbed: false 
                }); 
            }
        }
    } catch(e) {}
    
    // Fallback chung
    return JSON.stringify({ url: "", isEmbed: false }); 
}

function getUrlCategories() { return ""; }
function getUrlCountries() { return ""; }
function getUrlYears() { return ""; }
function parseCountriesResponse(html) { return "[]"; }
function parseYearsResponse(html) { return "[]"; }
function parseCategoriesResponse(html) { return "[]"; }

// =====================================================================
// BƯỚC 3: HỆ THỐNG GET SERVERS (FALLBACK TỪ OPHIM)
// =====================================================================

var _fallbackEpIndex = 1;

function getServers(slug) {
    var parts = slug.split("|");
    var prefix = parts[0];
    var title = "";
    
    if (prefix === "xpass_tv") {
        _fallbackEpIndex = parts[3]; // Lưu lại tập đang xem
        title = decodeURIComponent(parts[4] || "");
    } else if (prefix === "xpass_movie") {
        _fallbackEpIndex = "Full";
        title = decodeURIComponent(parts[2] || "");
    }
    
    if (title) {
        // App fetch API tìm kiếm của Ophim
        return "https://ophim1.com/v1/api/tim-kiem?keyword=" + encodeURIComponent(title);
    }
    return "";
}

function parseServerResponse(html) {
    try {
        var res = JSON.parse(html);
        if (res.data && res.data.items && res.data.items.length > 0) {
            // Lấy thẳng kết quả đầu tiên map được từ Ophim
            var slug = res.data.items[0].slug;
            
            // App sẽ tiếp tục dùng url này gọi parseEmbedResponse
            return JSON.stringify({
                name: "OPhim Dự Phòng",
                url: "https://ophim1.com/v1/api/phim/" + slug + "?ep=" + _fallbackEpIndex,
                isEmbed: true
            });
        }
    } catch(e) {}
    
    // Nếu tìm không thấy trên Ophim, nín luôn không hiển thị gì
    return JSON.stringify({});
}
