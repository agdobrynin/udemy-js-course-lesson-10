function customHttp() {

    const init = function (method = "GET", url, headers = {}) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
        });

        return xhr;
    }

    const request = function (xhr, callback) {
        xhr.addEventListener("load", () => {
            if (Math.floor(xhr.status / 100) !== 2) {
                const msg = `Статус: ${xhr.status}. Ошибка: ${xhr.statusText || `Обращение к ресурсу ${endpoint}`}`;
                callback(msg, xhr);

                return;
            }
            callback(null, JSON.parse(xhr.responseText));
        });

        xhr.addEventListener("error", () => {
            const msg = `Статус: ${xhr.status}. Ошибка: ${xhr.statusText || `Обращение к ресурсу ${endpoint}`}`;
            callback(msg, xhr);
        });
    }

    function buildQueryUrl(url, params) {
        if (!(params instanceof Object)) {
            return url;
        }

        if (Object.keys(params).length === 0) {
            return url;
        }

        let queryString = [];
        Object.entries(params).forEach(([key, value]) => {
            queryString.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
        });

        return url + (url.indexOf("?") === -1 ? "?" : "&") + queryString.join("&");
    }

    /**
     * @param {String} url
     * @param {object} queryStringParams
     * @param {callback} callback
     * @param {object} headers 
     */
    const get = function (url, queryStringParams, callback, headers = {}) {
        endpoint = buildQueryUrl(url, queryStringParams);
        const xhr = init("GET", endpoint, headers);
        request(xhr, callback);
        xhr.send();
    }

    /**
     * @param {String} url
     * @param {object} body
     * @param {callback} callback
     * @param {object} headers
     * @param {object} queryStringParams
     */
    const post = function (url, body, callback, headers = {}, queryStringParams = {}) {
        endpoint = buildQueryUrl(url, queryStringParams);
        const xhr = init("POST", url, headers);
        request(xhr, callback);
        xhr.send(JSON.stringify(body));
    }

    return {
        get,
        post,
    }
}

const newsService = (function (http) {

    const apiKey = "fc7c07b764284839bbd3515bc49d7edf";
    const apiEndpoint = "https://news-api-v2.herokuapp.com";

    const paramsQuery = {
        apiKey
    };

    const headers = {
        "Content-type": "application/json; charset=UTF-8",
    };

    // язык запроса по коду страны
    const defaultCountryCode = "ru";
    const countryToLanguage = {
        ru: "ru",
        us: "en",
    };

    function tryGetError(err, res) {
        try {
            err = JSON.parse(res.responseText)?.message || err;
        } catch (e) { }
        return err;
    }

    /**
     * @param {object} params
     * @param {callback} callback
     */
    const topNews = (params, callback) => {
        if (!params?.country) params.country = defaultCountryCode;
        params.language = countryToLanguage[params.country] || "";

        http.get(`${apiEndpoint}/top-headlines`, { ...params, ...paramsQuery }, (err, res) => {
            if (err) {
                err = `Топ новостей: ${tryGetError(err, res)}`;
            }
            callback(err, res);
        }, headers);
    }

    /**
     * @param {String} q
     * @param {object} params
     * @param {callback} callback
     */
    const searchNews = (q, params = {}, callback) => {
        params.language = countryToLanguage[params.country] || "";

        http.get(`${apiEndpoint}/everything`, { q, ...params, ...paramsQuery }, (err, res) => {
            if (err) {
                err = `Поиск новостей: ${tryGetError(err, res)}`;
            }
            callback(err, res);
        }, headers);
    }

    return {
        topNews,
        searchNews,
    }
})(customHttp());

// Рендер ответа в HTML
function renderCard(article) {
    const { urlToImage: image, url, title = "", description = "" } = article;

    return `
        <div class="col s12 m6">
            <div class="card">
                <div class="card-image">
                    <img src="${image || 'default.jpg'}">
                    <span class="card-title">${title}</span>
                </div>
                <div class="card-content">
                    <p>${description}</p>
                </div>
                <div class="card-action">
                    <a href="${url}" target="_blank">Read more</a>
                </div>
            </div>
        </div>
    `;
}

/**
 * @param {Array} articles
 */
function buildCardList(articles) {
    return articles.reduce((acc, article) => acc + renderCard(article), "");
}

/**
 * @param {HTMLElement} newsContainer
 */
function clearNewsContainer(newsContainer) {
    let child = newsContainer.lastChild;
    while (child) {
        newsContainer.removeChild(child);
        child = newsContainer.lastChild;
    }
}

function showToast(html, classes = 'red darken-4') {
    M.toast({ html, classes });
}

function renderResponse(err, response, newsContainer) {
    preloader(false);
    if (err) {
        return showToast(err);
    }
    const articles = response?.articles || [];
    clearNewsContainer(newsContainer);
    if (articles.length === 0) {
        return showToast('По запроу ничего не найдено', 'blue lighten-1');
    }
    newsContainer.insertAdjacentHTML("afterbegin", buildCardList((articles)));
}

function preloader(show) {
    const preloader = document.querySelector(".progress");
    if (preloader) {
        Boolean(show) ? preloader.classList.remove("hide") : preloader.classList.add("hide");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    preloader(true);
    M.AutoInit();

    const newsContainer = document.querySelector("#articles-result");
    const form = document.forms["article-search"];

    form["q"]?.addEventListener("input", (event) => {
        if (event.target.value) {
            form["category"].value = "";
            M.FormSelect.init(form["category"]);
        }
    });

    form["category"]?.addEventListener("change", (event) => {
        if (event.target.value) {
            form["q"].value = "";
        }
    });

    form.addEventListener("submit", (event) => {
        preloader(true);
        event.preventDefault();
        const queryParams = {
            country: form["country"]?.value,
            category: form["category"]?.value,
        };
        if (form["q"]?.value) {
            newsService.searchNews(form["q"]?.value, queryParams, (err, res) => renderResponse(err, res, newsContainer));
        } else {
            newsService.topNews(queryParams, (err, res) => renderResponse(err, res, newsContainer));
        }
    });

    const queryParams = {
        country: form["country"]?.value,
        category: form["category"]?.value,
    };

    newsService.topNews(queryParams, (err, res) => renderResponse(err, res, newsContainer));
});
