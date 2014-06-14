/*!
 * jQuery Cookie Plugin v1.4.0
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function(factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as anonymous module.
        define(['jquery'], factory);
    } else {
        // Browser globals.
        factory(jQuery);
    }
}(function($) {

    var pluses = /\+/g;

    function encode(s) {
        return config.raw ? s : encodeURIComponent(s);
    }

    function decode(s) {
        return config.raw ? s : decodeURIComponent(s);
    }

    function stringifyCookieValue(value) {
        return encode(config.json ? JSON.stringify(value) : String(value));
    }

    function parseCookieValue(s) {
        if (s.indexOf('"') === 0) {
            // This is a quoted cookie as according to RFC2068, unescape...
            s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        try {
            // Replace server-side written pluses with spaces.
            // If we can't decode the cookie, ignore it, it's unusable.
            // If we can't parse the cookie, ignore it, it's unusable.
            s = decodeURIComponent(s.replace(pluses, ' '));
            return config.json ? JSON.parse(s) : s;
        } catch (e) {}
    }

    function read(s, converter) {
        var value = config.raw ? s : parseCookieValue(s);
        return $.isFunction(converter) ? converter(value) : value;
    }

    var config = $.cookie = function(key, value, options) {

        // Write
        if (value !== undefined && !$.isFunction(value)) {
            options = $.extend({}, config.defaults, options);

            if (typeof options.expires === 'number') {
                var days = options.expires,
                    t = options.expires = new Date();
                t.setDate(t.getDate() + days);
            }

            return (document.cookie = [
                encode(key), '=', stringifyCookieValue(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path ? '; path=' + options.path : '',
                options.domain ? '; domain=' + options.domain : '',
                options.secure ? '; secure' : ''
            ].join(''));
        }

        // Read

        var result = key ? undefined : {};

        // To prevent the for loop in the first place assign an empty array
        // in case there are no cookies at all. Also prevents odd result when
        // calling $.cookie().
        var cookies = document.cookie ? document.cookie.split('; ') : [];

        for (var i = 0, l = cookies.length; i < l; i++) {
            var parts = cookies[i].split('=');
            var name = decode(parts.shift());
            var cookie = parts.join('=');

            if (key && key === name) {
                // If second argument (value) is a function it's a converter...
                result = read(cookie, value);
                break;
            }

            // Prevent storing a cookie that we couldn't decode.
            if (!key && (cookie = read(cookie)) !== undefined) {
                result[name] = cookie;
            }
        }

        return result;
    };

    config.defaults = {};

    $.removeCookie = function(key, options) {
        if ($.cookie(key) === undefined) {
            return false;
        }

        // Must not alter options, thus extending a fresh object...
        $.cookie(key, '', $.extend({}, options, {
            expires: -1
        }));
        return !$.cookie(key);
    };

}));



var BaasBox = (function() {

    var instance;
    var user;
    var endPoint;
    var COOKIE_KEY = "baasbox-cookie";

    // permission constants
    var READ_PERMISSION = "read";
    var DELETE_PERMISSION = "delete";
    var UPDATE_PERMISSION = "update";

    // role constants, by default in the BaasBox back end
    var ANONYMOUS_ROLE = "anonymous";
    var REGISTERED_ROLE = "registered";
    var ADMINISTRATOR_ROLE = "administrator";

    // check if the user is using Zepto, otherwise the standard jQuery ajaxSetup function is executed
    if (window.Zepto) {
        $.ajaxSettings.global = true;
        $.ajaxSettings.beforeSend = function(r, settings) {
            if (BaasBox.getCurrentUser()) {
                r.setRequestHeader('X-BB-SESSION', BaasBox.getCurrentUser().token);
            }
            r.setRequestHeader('X-BAASBOX-APPCODE', BaasBox.appcode);
        };
    } else {
        $.ajaxSetup({
            global: true,
            beforeSend: function(r, settings) {
                if (BaasBox.getCurrentUser()) {
                    r.setRequestHeader('X-BB-SESSION', BaasBox.getCurrentUser().token);
                }
                r.setRequestHeader('X-BAASBOX-APPCODE', BaasBox.appcode);
            }
        });
    }

    function createInstance() {

        var object = new Object("I am the BaasBox instance");
        return object;

    }

    function setCurrentUser(userObject) {

        if (userObject === null) {
            return;
        }

        this.user = userObject;

        // if the user is using Zepto, then local storage must be used (if supported by the current browser)
        if (window.Zepto && window.localStorage) {
                window.localStorage.setItem(COOKIE_KEY, JSON.stringify(this.user));
        } else {
            $.cookie(COOKIE_KEY, JSON.stringify(this.user));
        }
    }

    function getCurrentUser() {
        // if the user is using Zepto, then local storage must be used (if supported by the current browser)
        if (window.Zepto && window.localStorage) {
            if (localStorage.getItem(COOKIE_KEY)) {
                this.user = JSON.parse(localStorage.getItem(COOKIE_KEY));
            }
        } else {
            if ($.cookie(COOKIE_KEY)) {
                this.user = JSON.parse($.cookie(COOKIE_KEY));
            }
        }

        return this.user;

    }

    return {

        appcode: "",
        pagelength: 50,
        version: "0.3.6",

        getInstance: function() {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        },

        setEndPoint: function(endPointURL) {

            var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;

            if (regexp.test(endPointURL)) {

                this.endPoint = endPointURL;

            } else {

                alert(endPointURL + " is not a valid URL");

            }

        },

        endPoint: function() {
            return this.endPoint;
        },

        login: function(user, pass, cb) {

            var url = BaasBox.endPoint + '/login';
            var req = $.post(url, {
                    username: user,
                    password: pass,
                    appcode: BaasBox.appcode
                })
                .done(function(res) {
                    var roles = [];

                    $(res.data.user.roles).each(function(idx, r) {
                        roles.push(r.name);
                    });

                    setCurrentUser({
                        "username": res.data.user.name,
                        "token": res.data['X-BB-SESSION'],
                        "roles": roles
                    });
                    var u = getCurrentUser();
                    console.log("current user " + u);
                    cb(u, null);
                })
                .fail(function(e) {
                    console.log("error" + e);
                    cb(null, JSON.parse(e.responseText));
                });

        },

        logout: function(cb) {

            var u = getCurrentUser();
            if (u === null) {

                cb({
                    "data": "ok",
                    "message": "User already logged out"
                }, null);
                return;
            }

            var url = BaasBox.endPoint + '/logout';

            var req = $.ajax({
                url: url,
                method: 'POST',
                success: function(res) {
                    // if the user is using Zepto, then local storage must be used (if supported by the current browser)
                    if(window.Zepto && window.localStorage) {
                        window.localStorage.removeItem(COOKIE_KEY);
                    } else {
                        $.cookie(COOKIE_KEY, null);
                    }
                    setCurrentUser(null);
                    cb({
                        "data": "ok",
                        "message": "User logged out"
                    }, null);
                },
                error: function(e) {
                    cb(null, JSON.parse(e.responseText));
                }
            });
        },

        createUser: function(user, pass, cb) {

            var url = BaasBox.endPoint + '/user';

            var req = $.ajax({
                url: url,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    username: user,
                    password: pass
                }),
                success: function(res) {

                    var roles = [];

                    $(res.data.user.roles).each(function(idx, r) {
                        roles.push(r.name);
                    });

                    setCurrentUser({
                        "username": res.data.user.name,
                        "token": res.data['X-BB-SESSION'],
                        "roles": roles
                    });

                    var u = getCurrentUser();
                    cb(u, null);
                },
                error: function(e) {
                    cb(null, JSON.parse(e.responseText));
                }
            });

        },

        getCurrentUser: function() {
            return getCurrentUser();
        },

        loadCollectionWithParams: function(collection, params, callback) {

            console.log("loading collection " + collection);

            var url = BaasBox.endPoint + '/document/' + collection;
            var req = $.ajax({
                url: url,
                method: 'GET',
                timeout: 20000,
                contentType: 'application/json',
                dataType: 'json',
                data: params,
                success: function(res) {
                    callback(res['data'], null);
                },
                error: function(e) {
                    if (e.status === 0) { // TODO: is this the best way?
                        e.responseText = "{'result':'error','message':'Server is probably down'}";
                    }
                    callback(null, e);
                }
            });

        },

        loadCollection: function(collection, callback) {

            BaasBox.loadCollectionWithParams(collection, {
                page: 0,
                recordsPerPage: BaasBox.pagelength
            }, callback);

        },

        // only for json assets
        loadAssetData: function(asset, callback) {

            var url = BaasBox.endPoint + '/asset/' + asset + '/data';
            var req = $.ajax({
                url: url,
                method: 'GET',
                contentType: 'application/json',
                dataType: 'json',
                success: function(res) {
                    callback(res['data'], null);
                },
                error: function(e) {
                    callback(null, JSON.parse(e.responseText));
                }
            });

        },

        isEmpty: function(ob) {
            for (var i in ob) {
                return false;
            }
            return true;
        },

        getImageURI: function(name, params, callback) {

            var uri = BaasBox.endPoint + '/asset/' + name;
            var r;

            if (params === null || this.isEmpty(params)) {
                callback({
                    "data": uri + "?X-BAASBOX-APPCODE=" + BaasBox.appcode
                }, null);
                return;
            }

            for (var prop in params) {
                var a = [];
                a.push(prop);
                a.push(params[prop]);
                r = a.join('/');
            }

            uri = uri.concat('/');
            uri = uri.concat(r);

            p = {};
            p['X-BAASBOX-APPCODE'] = BaasBox.appcode;
            var req = $.get(uri, p)
                .done(function(res) {
                    console.log("URI is ", this.url);
                    callback({
                        "data": this.url
                    }, null);
                })
                .fail(function(e) {
                    console.log("error in URI ", e);
                    callback(null, JSON.parse(e.responseText));
                });

        },

        save: function(object, collection, callback) {

            var method = 'POST';
            var url = BaasBox.endPoint + '/document/' + collection;

            if (object.id) {
                method = 'PUT';
                url = BaasBox.endPoint + '/document/' + collection + '/' + object.id;
            }

            json = JSON.stringify(object);

            var req = $.ajax({
                url: url,
                type: method,
                contentType: 'application/json',
                dataType: 'json',
                data: json,
                success: function(res) {
                    callback(res['data'], null);
                },
                error: function(e) {
                    callback(null, JSON.parse(e.responseText));
                }
            });

        },

        updateField: function(objectId, collection, field, newValue, callback) {

            url = BaasBox.endPoint + '/document/' + collection + '/' + objectId + '/.' + field;
            var json = JSON.stringify({
                "data": newValue
            });

            var req = $.ajax({
                url: url,
                type: 'PUT',
                contentType: 'application/json',
                dataType: 'json',
                data: json,
                success: function(res) {
                    callback(res['data'], null);
                },
                error: function(e) {
                    callback(null, e.responseText);
                }
            });

        },

        delete: function(objectId, collection, callback) {

            url = BaasBox.endPoint + '/document/' + collection + '/' + objectId;

            var req = $.ajax({
                url: url,
                method: 'DELETE',
                success: function(res) {
                    callback(res['data'], null);
                },
                error: function(e) {
                    callback(null, JSON.parse(e.responseText));
                }
            });

        }


    };

})();