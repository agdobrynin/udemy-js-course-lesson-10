const newsService = (function () {

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

    async function request(url, params = {}) {
        try {
            params.language = countryToLanguage[params.country] || "";
            url = buildQueryUrl(url, { ...params, ...paramsQuery });

            return await fetch(url, { headers }).then(async (res) => {
                if (!res.ok) {
                    try {
                        const json = await res.json();
                        return Promise.reject(`Error in request: ${json?.message || res.statusText}`);
                    } catch {
                        return Promise.reject(`Error code: ${res.status} ${res.statusText} when get from url ${url}`);
                    }
                }
                return res.json();
            });
        } catch (error) {
            return Promise.reject(error);
        }
    }

    const topNews = async (params) => {
        if (!params?.country) params.country = defaultCountryCode;

        return request(`${apiEndpoint}/top-headlines`, params);
    }

    const searchNews = async (q, params = {}) => request(`${apiEndpoint}/everything`, { q, ...params });

    return {
        topNews,
        searchNews,
    };
})();


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

function renderResponse(response, newsContainer) {
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

document.addEventListener("DOMContentLoaded", async () => {
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

    form.addEventListener("submit", async (event) => {
        preloader(true);
        event.preventDefault();
        const queryParams = {
            country: form["country"]?.value,
            category: form["category"]?.value,
        };

        let result = null;

        if (form["q"]?.value) {
            result = await newsService.searchNews(form["q"]?.value, queryParams).catch(error => showToast(error));
        } else {
            result = await newsService.topNews(queryParams).catch(error => showToast(error));
        }
        renderResponse(result, newsContainer);

        preloader(false);
    });

    const queryParams = {
        country: form["country"]?.value,
        category: form["category"]?.value,
    };

    newsService.topNews(queryParams).then(articles => renderResponse(articles, newsContainer)).catch(error => showToast(error));
    preloader(false);
});
