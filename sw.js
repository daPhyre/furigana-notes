/*eslint-env serviceworker*/
/*jslint es5: true*/
(function (self, undefined) {
    'use strict';
    var CACHE_VERSION = 1,
        cachePaths = [
            './',
            './style.css',
            './script.js',
            './images/ic_add_white_24px.svg',
            './images/ic_arrow_back_white_24px.svg',
            './images/ic_done_white_24px.svg',
            './images/ic_edit_white_24px.svg',
            './images/ic_help_white_24px.svg'
        ];

    self.addEventListener('install', function (event) {
        event.waitUntil(
            caches.open(CACHE_VERSION).then(function (cache) {
                console.log('Opened cache');
                return cache.addAll(cachePaths);
            })
        );
    });

    self.addEventListener('fetch', function (event) {
        event.respondWith(
            caches.match(event.request).then(function (response) {
                return response || fetch(event.request.clone()).then(function (response) {
                    caches.open(CACHE_VERSION).then(function (cache) {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
        );
    });

    self.addEventListener('activate', function (event) {
        var cacheWhitelist = [CACHE_VERSION];

        event.waitUntil(
            caches.keys().then(function (keyList) {
                return Promise.all(
                    keyList.map(function (key) {
                        if (cacheWhitelist.indexOf(key) === -1) {
                            return caches.delete(key);
                        }
                    })
                );
            })
        );
    });
}(self));
