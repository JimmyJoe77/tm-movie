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
var FRENCH_STREAM_DOMAIN = "https://french-stream.one";
var FRENCH_STREAM_COOKIE = "";
var FRENCH_STREAM_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
var HLS_MIME_TYPE = "application/x-mpegURL";
var DEBUG = false;
var _LAST_FRENCH_META = null;
var _LAST_FRENCH_SEARCH_URL = "";

function debugLog() {
    if (!DEBUG || typeof console === "undefined" || !console.log) return;
    try {
        console.log.apply(console, arguments);
    } catch (e) {}
}

function getManifest() {
    return JSON.stringify({
        "id": "tmdb_xpass",
        "name": "Phim TMDB Cao Cấp",
        "version": "1.4.1",
        "baseUrl": BASE_URL,
        "type": "video",
        "author": "Antigravity",
        "description": "Nguồn phim quốc tế TMDB, hỗ trợ Xpass + FrenchStream và trích xuất M3U8 trực tiếp"
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

    // Nguồn FrenchStream (search -> detail -> film_api -> vidzy embed -> m3u8)
    if (prefix === "frs_tv") {
        var metaTv = {
            source: "french_stream",
            type: "tv",
            tmdbId: parts[1] || "",
            season: parts[2] || "",
            episode: parts[3] || "",
            year: parts[4] || "",
            title: safeDecodeURIComponent(parts[5] || "")
        };
        _LAST_FRENCH_META = metaTv;
        _LAST_FRENCH_SEARCH_URL = buildFrenchSearchUrl(metaTv);
        return _LAST_FRENCH_SEARCH_URL;
    }
    if (prefix === "frs_movie") {
        var metaMovie = {
            source: "french_stream",
            type: "movie",
            tmdbId: parts[1] || "",
            year: parts[2] || "",
            title: safeDecodeURIComponent(parts[3] || "")
        };
        _LAST_FRENCH_META = metaMovie;
        _LAST_FRENCH_SEARCH_URL = buildFrenchSearchUrl(metaMovie);
        return _LAST_FRENCH_SEARCH_URL;
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
            var sourceTitle = original || title || finalTitle;
            
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
                        var epsXpass = [];
                        var epsFrench = [];
                        for (var i = 1; i <= season.episode_count; i++) {
                            epsXpass.push({
                                // Gửi kèm title để getServers dùng Search
                                id: "xpass_tv|" + json.id + "|" + season.season_number + "|" + i + "|" + encodeURIComponent(finalTitle),
                                name: "Tập " + i,
                                slug: season.season_number + "_" + i
                            });
                            epsFrench.push({
                                id: "frs_tv|" + json.id + "|" + season.season_number + "|" + i + "|" + year + "|" + encodeURIComponent(sourceTitle),
                                name: "Tập " + i,
                                slug: season.season_number + "_" + i
                            });
                        }

                        servers.push({
                            name: "Xpass - Phần " + season.season_number,
                            episodes: epsXpass
                        });

                        servers.push({
                            name: "FrenchStream - Phần " + season.season_number,
                            episodes: epsFrench
                        });
                    }
                }
            } else {
                cast = (json.credits && json.credits.cast) ? json.credits.cast.slice(0, 5).map(function(c) { return c.name; }).join(", ") : "";
                var encodedSourceTitle = encodeURIComponent(sourceTitle || finalTitle);

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

                servers.push({
                    name: "Nguồn FrenchStream",
                    episodes: [{
                        id: "frs_movie|" + json.id + "|" + year + "|" + encodedSourceTitle,
                        name: "Full HD - French",
                        slug: "full_french"
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

function parseDetailResponse(html, sourceUrl) {
    var requestUrl = String(sourceUrl || _LAST_FRENCH_SEARCH_URL || "");

    // Giai đoạn: Người dùng đã bấm Xem Phim Tập N -> HTML này là giao diện web Xpass
    var playlistMatch = html.match(/"playlist"\s*:\s*"([^"]+)"/i);
    if (playlistMatch) {
        var playlistUrl = "https://play.xpass.top" + playlistMatch[1];
        return JSON.stringify({ 
            // Trả về url playlist.json, VAAPP sẽ tiếp tục Fetch đệ quy cái url này qua parseEmbedResponse
            url: playlistUrl, 
            headers: buildXpassHeaders("https://play.xpass.top/"),
            isEmbed: true 
        });
    }

    // Nguồn FrenchStream: parse trang search để tìm detail link phù hợp
    var looksLikeFrenchSearch = isLikelyFrenchSearchResponse(html);
    var isFrenchSearchUrl = requestUrl.indexOf(FRENCH_STREAM_DOMAIN) !== -1 && requestUrl.indexOf("subaction=search") !== -1;
    if (isFrenchSearchUrl || looksLikeFrenchSearch) {
        var meta = parseFrenchMetaFromUrl(requestUrl);
        if (!meta || !meta.tmdbId) {
            meta = _LAST_FRENCH_META || {};
        }
        var headers = buildFrenchHeaders(requestUrl);
        var items = parseFrenchSearchItems(html);
        var detailUrl = findFrenchDetailUrl(items, meta);
        var blocked = isFrenchSearchBlocked(html);

        debugLog("[FrenchStream] urlRequest:", requestUrl);
        debugLog("[FrenchStream] headers:", JSON.stringify(headers));
        debugLog("[FrenchStream] item count:", items.length);
        if (blocked) {
            debugLog("[FrenchStream] search appears blocked/challenge page");
        }

        if (detailUrl) {
            return JSON.stringify({
                url: detailUrl,
                headers: headers,
                isEmbed: true
            });
        }

        // Nếu search không ra kết quả/đang bị challenge, fallback về Xpass để đảm bảo vẫn play được.
        var fallbackUrl = buildFrenchFallbackUrl(meta);
        if (fallbackUrl) {
            debugLog("[FrenchStream] fallback to xpass:", fallbackUrl);
            return JSON.stringify({
                url: fallbackUrl,
                headers: buildXpassHeaders(fallbackUrl),
                isEmbed: true
            });
        }
    }

    return JSON.stringify({url: ""});
}

function parseEmbedResponse(html, url) { 
    // Giai đoạn: Nhận HTML (hoặc JSON) từ nguồn chi tiết

    var rawHtml = String(html || "");

    // Một số runtime app có thể đưa thẳng nội dung m3u8 vào parseEmbedResponse.
    // Trường hợp này trả lại chính URL đã fetch để player phát trực tiếp.
    if (rawHtml.indexOf("#EXTM3U") !== -1 && url) {
        return JSON.stringify({
            url: url,
            headers: guessStreamHeaders(url),
            mimeType: HLS_MIME_TYPE,
            subtitles: [],
            isEmbed: false
        });
    }

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
                mimeType: isLikelyHlsUrl(streamUrl) ? HLS_MIME_TYPE : "",
                subtitles: [],
                isEmbed: false
            });
        } catch(e) {}
    }

    // Hỗ trợ fallback: parse HTML trang Xpass để bẻ sang playlist JSON.
    if (url && url.indexOf("play.xpass.top/e/") !== -1) {
        var xpassPlaylistMatch = String(html || "").match(/"playlist"\s*:\s*"([^"]+)"/i);
        if (xpassPlaylistMatch) {
            return JSON.stringify({
                url: "https://play.xpass.top" + xpassPlaylistMatch[1],
                headers: buildXpassHeaders(url),
                isEmbed: true
            });
        }
    }

    // 2. Nguồn FrenchStream: từ detail page -> film_api.php
    if (url && url.indexOf(FRENCH_STREAM_DOMAIN) !== -1 && url.indexOf("/engine/ajax/film_api.php") === -1) {
        try {
            var newsIdMatch = html.match(/data-newsid\s*=\s*"?(\d+)/i);
            if (newsIdMatch) {
                var apiUrl = FRENCH_STREAM_DOMAIN + "/engine/ajax/film_api.php?id=" + newsIdMatch[1];
                debugLog("[FrenchStream] detail -> api:", apiUrl);
                return JSON.stringify({
                    url: apiUrl,
                    headers: buildFrenchHeaders(url),
                    isEmbed: true
                });
            }
        } catch (e1) {
            debugLog("[FrenchStream] detail parse error:", e1.message || e1);
        }
    }

    // 3. Nguồn FrenchStream: film_api.php -> chọn player URL
    if (url && url.indexOf("/engine/ajax/film_api.php") !== -1) {
        try {
            var api = JSON.parse(html);
            var pickedUrl = pickFrenchPlayerUrl(api && api.players ? api.players : {});
            if (pickedUrl) {
                debugLog("[FrenchStream] picked player URL:", pickedUrl);
                return JSON.stringify({
                    url: pickedUrl,
                    headers: {
                        "Referer": FRENCH_STREAM_DOMAIN + "/",
                        "Origin": FRENCH_STREAM_DOMAIN,
                        "User-Agent": FRENCH_STREAM_USER_AGENT,
                        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
                    },
                    isEmbed: true
                });
            }
        } catch (e2) {
            debugLog("[FrenchStream] film_api parse error:", e2.message || e2);
        }
    }

    // 4. Nguồn FrenchStream: ViDZY / FSVID embed -> giải script packer để lấy m3u8 thật
    if (url && (url.indexOf("vidzy.live/embed-") !== -1 || url.indexOf("fsvid.lol/embed-") !== -1)) {
        try {
            var streamFromPacked = extractPackedM3u8Url(html);
            if (streamFromPacked) {
                var originHost = (url.indexOf("fsvid.lol") !== -1) ? "https://fsvid.lol" : "https://vidzy.live";
                debugLog("[FrenchStream] extracted m3u8:", streamFromPacked);
                return JSON.stringify({
                    url: streamFromPacked,
                    headers: {
                        "Referer": originHost + "/",
                        "Origin": originHost,
                        "User-Agent": FRENCH_STREAM_USER_AGENT,
                        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
                    },
                    mimeType: HLS_MIME_TYPE,
                    subtitles: [],
                    isEmbed: false
                });
            }
        } catch (e3) {
            debugLog("[FrenchStream] packed stream parse error:", e3.message || e3);
        }
    }

    // 5. Nếu là nguồn Xpass playlist (Xpass JSON)
    try {
        var json = JSON.parse(html);
        if (json.playlist && json.playlist.length > 0) {
            var sources = json.playlist[0].sources;
            if (sources && sources.length > 0) {
                var streamUrl = sources[0].file;
                
                // M3U8 CHUẨN! Trả về cho Native Video Player
                return JSON.stringify({ 
                    url: streamUrl, 
                    headers: buildXpassHeaders("https://play.xpass.top/"),
                    mimeType: HLS_MIME_TYPE,
                    subtitles: [],
                    isEmbed: false 
                }); 
            }
        }
    } catch(e) {}
    
    // Fallback chung
    return JSON.stringify({ url: "", isEmbed: false }); 
}

function safeDecodeURIComponent(value) {
    try {
        return decodeURIComponent(value);
    } catch (e) {
        return value || "";
    }
}

function decodeHtmlEntities(text) {
    return String(text || "")
        .replace(/&#(\d+);/g, function(_, n) { return String.fromCharCode(parseInt(n, 10)); })
        .replace(/&#x([0-9a-f]+);/gi, function(_, n) { return String.fromCharCode(parseInt(n, 16)); })
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#039;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ");
}

function normalizeTitleForCompare(text) {
    var value = decodeHtmlEntities(text || "");
    value = value.replace(/<[^>]*>/g, " ");
    if (typeof value.normalize === "function") {
        value = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    value = value.toLowerCase();
    value = value.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    return value;
}

function toAbsoluteUrl(base, url) {
    var clean = String(url || "").trim();
    if (!clean) return "";
    if (/^https?:\/\//i.test(clean)) return clean;
    if (clean.indexOf("//") === 0) return "https:" + clean;
    if (clean.charAt(0) === "/") return String(base || "").replace(/\/$/, "") + clean;
    return String(base || "").replace(/\/$/, "") + "/" + clean.replace(/^\//, "");
}

function buildFrenchSearchUrl(meta) {
    var title = String(meta && meta.title ? meta.title : "").toLowerCase().trim();
    var story = encodeURIComponent(title).replace(/%20/g, "+");
    var urlRequest = FRENCH_STREAM_DOMAIN + "/?story=" + story + "&do=search&subaction=search";

    try {
        urlRequest += "&va_meta=" + encodeURIComponent(JSON.stringify(meta || {}));
    } catch (e) {
        // no-op
    }

    return urlRequest;
}

function parseFrenchMetaFromUrl(url) {
    var query = String(url || "");
    var match = query.match(/[?&]va_meta=([^&]+)/i);
    if (!match) return {};

    try {
        return JSON.parse(decodeURIComponent(match[1]));
    } catch (e) {
        return {};
    }
}

function buildFrenchHeaders(urlRequest) {
    var referer = String(urlRequest || FRENCH_STREAM_DOMAIN + "/");
    if (referer.indexOf(FRENCH_STREAM_DOMAIN) !== 0) {
        referer = FRENCH_STREAM_DOMAIN + "/";
    }
    var origin = getUrlOrigin(referer) || FRENCH_STREAM_DOMAIN;
    var headers = {
        "Referer": referer,
        "Origin": origin,
        "User-Agent": FRENCH_STREAM_USER_AGENT,
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept": "*/*"
    };

    if (FRENCH_STREAM_COOKIE) {
        headers["Cookie"] = FRENCH_STREAM_COOKIE;
    }

    return headers;
}

function buildXpassHeaders(refererUrl) {
    var referer = String(refererUrl || "https://play.xpass.top/");
    if (!/^https?:\/\//i.test(referer)) {
        referer = "https://play.xpass.top/";
    }
    if (referer.indexOf("play.xpass.top") === -1) {
        referer = "https://play.xpass.top/";
    }
    if (referer.indexOf("/mdata/") !== -1 || referer.indexOf("/mvid/") !== -1 || referer.indexOf("/playlist") !== -1) {
        referer = "https://play.xpass.top/";
    }

    return {
        "Referer": referer,
        "Origin": "https://play.xpass.top",
        "User-Agent": FRENCH_STREAM_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "*/*"
    };
}

function guessStreamHeaders(streamUrl) {
    var url = String(streamUrl || "");
    if (!url) return {};

    if (/play\.xpass\.top|trovianaworks\.online/i.test(url)) {
        return buildXpassHeaders("https://play.xpass.top/");
    }

    var origin = getUrlOrigin(url);
    if (!origin) return {};

    return {
        "Referer": origin + "/",
        "Origin": origin,
        "User-Agent": FRENCH_STREAM_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "*/*"
    };
}

function isLikelyHlsUrl(url) {
    return /\.m3u8(\?|$)/i.test(String(url || ""));
}

function getUrlOrigin(url) {
    var source = String(url || "");
    var m = source.match(/^(https?:\/\/[^\/]+)/i);
    return m ? m[1] : "";
}

function parseFrenchSearchItems(html) {
    var out = [];
    var source = String(html || "");
    var pairRegex = /<a[^>]*class=['"][^'"]*short-poster[^'"]*['"][^>]*href=['"]([^'"]+)['"][^>]*>[\s\S]*?<div[^>]*class=['"][^'"]*short-title[^'"]*['"][^>]*>([\s\S]*?)<\/div>/gi;
    var match;

    while ((match = pairRegex.exec(source)) !== null) {
        var href = toAbsoluteUrl(FRENCH_STREAM_DOMAIN, match[1]);
        var title = decodeHtmlEntities(match[2]).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        if (!href || !title) continue;

        out.push({
            href: href,
            title: title,
            normalized: normalizeTitleForCompare(title)
        });
    }

    // Fallback parser cho markup cũ.
    if (out.length === 0) {
        var chunks = source.split(/<div[^>]*class=['"][^'"]*\bshort\b[^'"]*['"][^>]*>/i);

        for (var i = 1; i < chunks.length; i++) {
            var chunk = chunks[i];
            var hrefMatch = chunk.match(/class=['"][^'"]*short-poster[^'"]*['"][^>]*href=['"]([^'"]+)['"]/i);
            var titleMatch = chunk.match(/class=['"][^'"]*short-title[^'"]*['"][^>]*>\s*([\s\S]*?)\s*<\/div>/i);

            if (!hrefMatch || !titleMatch) continue;

            var href2 = toAbsoluteUrl(FRENCH_STREAM_DOMAIN, hrefMatch[1]);
            var title2 = decodeHtmlEntities(titleMatch[1]).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

            if (!href2 || !title2) continue;
            out.push({
                href: href2,
                title: title2,
                normalized: normalizeTitleForCompare(title2)
            });
        }
    }

    return out;
}

function isFrenchSearchBlocked(html) {
    var source = String(html || "");
    if (!source) return true;

    return /<title>\s*Chargement en cours\s*<\/title>/i.test(source) ||
        /attention required/i.test(source) ||
        /cf-browser-verification/i.test(source) ||
        /just a moment/i.test(source);
}

function isLikelyFrenchSearchResponse(html) {
    var source = String(html || "");
    if (!source) return false;

    return /short-poster/i.test(source) ||
        /short-title/i.test(source) ||
        /<title>\s*Chargement en cours\s*<\/title>/i.test(source);
}

function buildFrenchFallbackUrl(meta) {
    var safeMeta = meta || {};
    var tmdbId = String(safeMeta.tmdbId || "").trim();
    if (!tmdbId) return "";

    var type = String(safeMeta.type || "movie").toLowerCase();
    if (type === "tv") {
        var season = String(safeMeta.season || "1").trim() || "1";
        var episode = String(safeMeta.episode || "1").trim() || "1";
        return "https://play.xpass.top/e/tv/" + tmdbId + "/" + season + "/" + episode;
    }

    return "https://play.xpass.top/e/movie/" + tmdbId;
}

function buildFrenchTitleTargets(meta) {
    var title = String(meta && meta.title ? meta.title : "").trim();
    var year = String(meta && meta.year ? meta.year : "").trim();
    var season = String(meta && meta.season ? meta.season : "").trim();
    var type = String(meta && meta.type ? meta.type : "movie").toLowerCase();

    var targets = [];
    if (!title) return targets;

    if (type === "tv") {
        if (season) {
            targets.push(title + " - Saison " + season);
            targets.push(title + " Saison " + season);
            targets.push(title + ": Saison " + season);
        }
        targets.push(title);
    } else {
        targets.push(title);
        if (year && year !== "N/A") {
            targets.push(title + "(" + year + ")");
            targets.push(title + " (" + year + ")");
            targets.push(title + " " + year);
        }
    }

    var normalized = [];
    var seen = {};

    for (var i = 0; i < targets.length; i++) {
        var norm = normalizeTitleForCompare(targets[i]);
        if (!norm || seen[norm]) continue;
        seen[norm] = true;
        normalized.push(norm);
    }

    return normalized;
}

function isFrenchTitleMatch(candidate, target) {
    if (!candidate || !target) return false;
    if (candidate === target) return true;
    if (candidate.indexOf(target) !== -1) return true;
    if (target.indexOf(candidate) !== -1) {
        var minLen = Math.max(8, Math.floor(target.length * 0.85));
        if (candidate.length >= minLen) return true;
    }
    return false;
}

function computeTitleSimilarity(candidate, target) {
    if (!candidate || !target) return 0;
    if (isFrenchTitleMatch(candidate, target)) return 1;

    var candParts = candidate.split(/\s+/).filter(Boolean);
    var targetParts = target.split(/\s+/).filter(Boolean);
    if (candParts.length === 0 || targetParts.length === 0) return 0;

    var lookup = {};
    for (var i = 0; i < targetParts.length; i++) {
        lookup[targetParts[i]] = true;
    }

    var common = 0;
    for (var j = 0; j < candParts.length; j++) {
        if (lookup[candParts[j]]) common += 1;
    }

    var denom = Math.max(targetParts.length, candParts.length);
    return denom > 0 ? (common / denom) : 0;
}

function findFrenchDetailUrl(items, meta) {
    if (!items || items.length === 0) return "";
    var targets = buildFrenchTitleTargets(meta || {});
    var bestItem = null;
    var bestScore = 0;

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        debugLog("[FrenchStream] compare title:", item.title);

        for (var j = 0; j < targets.length; j++) {
            var score = computeTitleSimilarity(item.normalized, targets[j]);
            if (score > bestScore) {
                bestScore = score;
                bestItem = item;
            }

            if (score >= 0.96) {
                debugLog("[FrenchStream] matched detail:", item.href);
                return item.href;
            }
        }
    }

    if (bestItem && bestScore >= 0.65) {
        debugLog("[FrenchStream] fuzzy matched detail:", bestItem.href, "score=", bestScore);
        return bestItem.href;
    }

    debugLog("[FrenchStream] no strict match, fallback first item:", items[0].href);
    return items[0].href;
}

function pickFrenchPlayerUrl(players) {
    if (!players || typeof players !== "object") return "";

    var candidates = [
        players.vidzy && players.vidzy["default"],
        players.vidzy && players.vidzy.vostfr,
        players.vidzy && players.vidzy.vfq,
        players.vidzy && players.vidzy.vff,
        players.premium && players.premium["default"],
        players.uqload && players.uqload["default"],
        players.voe && players.voe["default"],
        players.filmoon && players.filmoon["default"],
        players.dood && players.dood["default"]
    ];

    if (players.netu && players.netu["default"]) {
        candidates.push("https://1.multiup.us/player/embed_player.php?vid=" + players.netu["default"] + "&autoplay=no");
    }

    for (var i = 0; i < candidates.length; i++) {
        var url = String(candidates[i] || "").trim();
        if (/^https?:\/\//i.test(url)) {
            return url;
        }
    }

    return "";
}

function unpackEvalScripts(html) {
    var source = String(html || "");
    var scripts = [];
    var regex = /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('[\s\S]*?\.split\('\|'\)\)\)/g;
    var match;

    while ((match = regex.exec(source)) !== null) {
        try {
            var expression = match[0].slice(5, -1); // remove eval( ... )
            var decoded = (new Function("return (" + expression + ");"))();
            if (decoded) scripts.push(String(decoded));
        } catch (e) {
            debugLog("[FrenchStream] unpack eval error:", e.message || e);
        }
    }

    return scripts;
}

function extractPackedM3u8Url(html) {
    var rawHtml = String(html || "");
    var direct = rawHtml.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
    if (direct && direct[0]) {
        return decodeHtmlEntities(direct[0]);
    }

    var decodedScripts = unpackEvalScripts(rawHtml);
    for (var i = 0; i < decodedScripts.length; i++) {
        var m3u8Match = decodedScripts[i].match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
        if (m3u8Match && m3u8Match[0]) {
            return decodeHtmlEntities(m3u8Match[0]);
        }
    }

    return "";
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
