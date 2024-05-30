/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/naja/dist/Naja.esm.js":
/*!********************************************!*\
  !*** ./node_modules/naja/dist/Naja.esm.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HttpError: () => (/* binding */ HttpError),
/* harmony export */   Naja: () => (/* binding */ Naja),
/* harmony export */   "default": () => (/* binding */ naja)
/* harmony export */ });
/*
 * Naja.js
 * 3.1.0
 *
 * by Jiří Pudil <https://jiripudil.cz>
 */
// ready
const onDomReady = (callback) => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    }
    else {
        callback();
    }
};
// assert
class AssertionError extends Error {
}
const assert = (condition, description) => {
    if (!condition) {
        const message = `Assertion failed${description !== undefined ? `: ${description}` : '.'}`;
        throw new AssertionError(message);
    }
};

class UIHandler extends EventTarget {
    constructor(naja) {
        super();
        this.naja = naja;
        this.selector = '.ajax';
        this.allowedOrigins = [window.location.origin];
        this.handler = this.handleUI.bind(this);
        naja.addEventListener('init', this.initialize.bind(this));
    }
    initialize() {
        onDomReady(() => this.bindUI(window.document.body));
        this.naja.snippetHandler.addEventListener('afterUpdate', (event) => {
            const { snippet } = event.detail;
            this.bindUI(snippet);
        });
    }
    bindUI(element) {
        const selectors = [
            `a${this.selector}`,
            `input[type="submit"]${this.selector}`,
            `input[type="image"]${this.selector}`,
            `button[type="submit"]${this.selector}`,
            `button[form]:not([type])${this.selector}`,
            `form button:not([type])${this.selector}`,
            `form${this.selector} input[type="submit"]`,
            `form${this.selector} input[type="image"]`,
            `form${this.selector} button[type="submit"]`,
            `form${this.selector} button:not([type])`,
        ].join(', ');
        const bindElement = (element) => {
            element.removeEventListener('click', this.handler);
            element.addEventListener('click', this.handler);
        };
        const elements = element.querySelectorAll(selectors);
        elements.forEach((element) => bindElement(element));
        if (element.matches(selectors)) {
            bindElement(element);
        }
        const bindForm = (form) => {
            form.removeEventListener('submit', this.handler);
            form.addEventListener('submit', this.handler);
        };
        if (element.matches(`form${this.selector}`)) {
            bindForm(element);
        }
        const forms = element.querySelectorAll(`form${this.selector}`);
        forms.forEach((form) => bindForm(form));
    }
    handleUI(event) {
        const mouseEvent = event;
        if (mouseEvent.altKey || mouseEvent.ctrlKey || mouseEvent.shiftKey || mouseEvent.metaKey || mouseEvent.button) {
            return;
        }
        const element = event.currentTarget;
        const options = this.naja.prepareOptions();
        const ignoreErrors = () => {
            // don't reject the promise in case of an error as developers have no way of handling the rejection
            // in this situation; errors should be handled in `naja.addEventListener('error', errorHandler)`
        };
        if (event.type === 'submit') {
            this.submitForm(element, options, event).catch(ignoreErrors);
        }
        else if (event.type === 'click') {
            this.clickElement(element, options, mouseEvent).catch(ignoreErrors);
        }
    }
    async clickElement(element, options = {}, event) {
        let method = 'GET', url = '', data;
        if (element.tagName === 'A') {
            assert(element instanceof HTMLAnchorElement);
            method = 'GET';
            url = element.href;
            data = null;
        }
        else if (element.tagName === 'INPUT' || element.tagName === 'BUTTON') {
            assert(element instanceof HTMLInputElement || element instanceof HTMLButtonElement);
            const { form } = element;
            // eslint-disable-next-line no-nested-ternary,no-extra-parens
            method = element.getAttribute('formmethod')?.toUpperCase() ?? form?.getAttribute('method')?.toUpperCase() ?? 'GET';
            url = element.getAttribute('formaction') ?? form?.getAttribute('action') ?? window.location.pathname + window.location.search;
            data = new FormData(form ?? undefined);
            if (element.type === 'submit' && element.name !== '') {
                data.append(element.name, element.value || '');
            }
            else if (element.type === 'image') {
                const coords = element.getBoundingClientRect();
                const prefix = element.name !== '' ? `${element.name}.` : '';
                data.append(`${prefix}x`, Math.max(0, Math.floor(event !== undefined ? event.pageX - coords.left : 0)));
                data.append(`${prefix}y`, Math.max(0, Math.floor(event !== undefined ? event.pageY - coords.top : 0)));
            }
        }
        return this.processInteraction(element, method, url, data, options, event);
    }
    async submitForm(form, options = {}, event) {
        const method = form.getAttribute('method')?.toUpperCase() ?? 'GET';
        const url = form.getAttribute('action') ?? window.location.pathname + window.location.search;
        const data = new FormData(form);
        return this.processInteraction(form, method, url, data, options, event);
    }
    async processInteraction(element, method, url, data = null, options = {}, event) {
        if (!this.dispatchEvent(new CustomEvent('interaction', { cancelable: true, detail: { element, originalEvent: event, options } }))) {
            event?.preventDefault();
            return {};
        }
        if (!this.isUrlAllowed(`${url}`)) {
            throw new Error(`Cannot dispatch async request, URL is not allowed: ${url}`);
        }
        event?.preventDefault();
        return this.naja.makeRequest(method, url, data, options);
    }
    isUrlAllowed(url) {
        const urlObject = new URL(url, location.href);
        // ignore non-URL URIs (javascript:, data:, mailto:, ...)
        if (urlObject.origin === 'null') {
            return false;
        }
        return this.allowedOrigins.includes(urlObject.origin);
    }
}

class FormsHandler {
    constructor(naja) {
        this.naja = naja;
        naja.addEventListener('init', this.initialize.bind(this));
        naja.uiHandler.addEventListener('interaction', this.processForm.bind(this));
    }
    initialize() {
        onDomReady(() => this.initForms(window.document.body));
        this.naja.snippetHandler.addEventListener('afterUpdate', (event) => {
            const { snippet } = event.detail;
            this.initForms(snippet);
        });
    }
    initForms(element) {
        const netteForms = this.netteForms || window.Nette;
        if (!netteForms) {
            return;
        }
        if (element.tagName === 'form') {
            netteForms.initForm(element);
            return;
        }
        const forms = element.querySelectorAll('form');
        forms.forEach((form) => netteForms.initForm(form));
    }
    processForm(event) {
        const { element, originalEvent } = event.detail;
        const inputElement = element;
        if (inputElement.form !== undefined && inputElement.form !== null) {
            inputElement.form['nette-submittedBy'] = element;
        }
        const netteForms = this.netteForms || window.Nette;
        if ((element.tagName === 'FORM' || element.form) && netteForms && !netteForms.validateForm(element)) {
            originalEvent?.stopImmediatePropagation();
            originalEvent?.preventDefault();
            event.preventDefault();
        }
    }
}

class RedirectHandler extends EventTarget {
    constructor(naja) {
        super();
        this.naja = naja;
        naja.uiHandler.addEventListener('interaction', (event) => {
            const { element, options } = event.detail;
            if (element.hasAttribute('data-naja-force-redirect') || element.form?.hasAttribute('data-naja-force-redirect')) {
                const value = element.getAttribute('data-naja-force-redirect') ?? element.form?.getAttribute('data-naja-force-redirect');
                options.forceRedirect = value !== 'off';
            }
        });
        naja.addEventListener('success', (event) => {
            const { payload, options } = event.detail;
            if (!payload.redirect) {
                return;
            }
            this.makeRedirect(payload.redirect, options.forceRedirect ?? false, options);
            event.stopImmediatePropagation();
        });
        this.locationAdapter = {
            assign: (url) => window.location.assign(url),
        };
    }
    makeRedirect(url, force, options = {}) {
        if (url instanceof URL) {
            url = url.href;
        }
        let isHardRedirect = force || !this.naja.uiHandler.isUrlAllowed(url);
        const canRedirect = this.dispatchEvent(new CustomEvent('redirect', {
            cancelable: true,
            detail: {
                url,
                setUrl(value) {
                    url = value;
                },
                isHardRedirect,
                setHardRedirect(value) {
                    isHardRedirect = !!value;
                },
                options,
            },
        }));
        if (!canRedirect) {
            return;
        }
        if (isHardRedirect) {
            this.locationAdapter.assign(url);
        }
        else {
            this.naja.makeRequest('GET', url, null, options);
        }
    }
}

class SnippetHandler extends EventTarget {
    constructor(naja) {
        super();
        this.op = {
            replace: {
                updateElement(snippet, content) {
                    snippet.innerHTML = content;
                },
                updateIndex(_, newContent) {
                    return newContent;
                },
            },
            prepend: {
                updateElement(snippet, content) {
                    snippet.insertAdjacentHTML('afterbegin', content);
                },
                updateIndex(currentContent, newContent) {
                    return newContent + currentContent;
                },
            },
            append: {
                updateElement(snippet, content) {
                    snippet.insertAdjacentHTML('beforeend', content);
                },
                updateIndex(currentContent, newContent) {
                    return currentContent + newContent;
                },
            },
        };
        naja.addEventListener('success', (event) => {
            const { options, payload } = event.detail;
            if (!payload.snippets) {
                return;
            }
            this.updateSnippets(payload.snippets, false, options);
        });
    }
    static findSnippets(predicate, document = window.document) {
        const result = {};
        const snippets = document.querySelectorAll('[id^="snippet-"]');
        snippets.forEach((snippet) => {
            if (predicate?.(snippet) ?? true) {
                result[snippet.id] = snippet.innerHTML;
            }
        });
        return result;
    }
    async updateSnippets(snippets, fromCache = false, options = {}) {
        await Promise.all(Object.keys(snippets).map(async (id) => {
            const snippet = document.getElementById(id);
            if (snippet) {
                await this.updateSnippet(snippet, snippets[id], fromCache, options);
            }
        }));
    }
    async updateSnippet(snippet, content, fromCache, options) {
        let operation = this.op.replace;
        if ((snippet.hasAttribute('data-naja-snippet-prepend') || snippet.hasAttribute('data-ajax-prepend')) && !fromCache) {
            operation = this.op.prepend;
        }
        else if ((snippet.hasAttribute('data-naja-snippet-append') || snippet.hasAttribute('data-ajax-append')) && !fromCache) {
            operation = this.op.append;
        }
        const canUpdate = this.dispatchEvent(new CustomEvent('beforeUpdate', {
            cancelable: true,
            detail: {
                snippet,
                content,
                fromCache,
                operation,
                changeOperation(value) {
                    operation = value;
                },
                options,
            },
        }));
        if (!canUpdate) {
            return;
        }
        this.dispatchEvent(new CustomEvent('pendingUpdate', {
            detail: {
                snippet,
                content,
                fromCache,
                operation,
                options,
            },
        }));
        const updateElement = typeof operation === 'function' ? operation : operation.updateElement;
        await updateElement(snippet, content);
        this.dispatchEvent(new CustomEvent('afterUpdate', {
            detail: {
                snippet,
                content,
                fromCache,
                operation,
                options,
            },
        }));
    }
}

class HistoryHandler extends EventTarget {
    constructor(naja) {
        super();
        this.naja = naja;
        this.initialized = false;
        this.cursor = 0;
        this.popStateHandler = this.handlePopState.bind(this);
        naja.addEventListener('init', this.initialize.bind(this));
        naja.addEventListener('before', this.saveUrl.bind(this));
        naja.addEventListener('before', this.replaceInitialState.bind(this));
        naja.addEventListener('success', this.pushNewState.bind(this));
        naja.redirectHandler.addEventListener('redirect', this.saveRedirectedUrl.bind(this));
        naja.uiHandler.addEventListener('interaction', this.configureMode.bind(this));
        this.historyAdapter = {
            replaceState: (state, url) => window.history.replaceState(state, '', url),
            pushState: (state, url) => window.history.pushState(state, '', url),
        };
    }
    set uiCache(value) {
        console.warn('Naja: HistoryHandler.uiCache is deprecated, use options.snippetCache instead.');
        this.naja.defaultOptions.snippetCache = value;
    }
    handlePopState(event) {
        const { state } = event;
        if (state?.source !== 'naja') {
            return;
        }
        const direction = state.cursor - this.cursor;
        this.cursor = state.cursor;
        const options = this.naja.prepareOptions();
        this.dispatchEvent(new CustomEvent('restoreState', { detail: { state, direction, options } }));
    }
    initialize() {
        window.addEventListener('popstate', this.popStateHandler);
    }
    saveUrl(event) {
        const { url, options } = event.detail;
        options.href ??= url;
    }
    saveRedirectedUrl(event) {
        const { url, options } = event.detail;
        options.href = url;
    }
    replaceInitialState(event) {
        const { options } = event.detail;
        const mode = HistoryHandler.normalizeMode(options.history);
        if (mode !== false && !this.initialized) {
            onDomReady(() => this.historyAdapter.replaceState(this.buildState(window.location.href, 'replace', this.cursor, options), window.location.href));
            this.initialized = true;
        }
    }
    configureMode(event) {
        const { element, options } = event.detail;
        if (element.hasAttribute('data-naja-history') || element.form?.hasAttribute('data-naja-history')) {
            const value = element.getAttribute('data-naja-history') ?? element.form?.getAttribute('data-naja-history');
            options.history = HistoryHandler.normalizeMode(value);
        }
    }
    static normalizeMode(mode) {
        if (mode === 'off' || mode === false) {
            return false;
        }
        else if (mode === 'replace') {
            return 'replace';
        }
        return true;
    }
    pushNewState(event) {
        const { payload, options } = event.detail;
        const mode = HistoryHandler.normalizeMode(options.history);
        if (mode === false) {
            return;
        }
        if (payload.postGet && payload.url) {
            options.href = payload.url;
        }
        const method = mode === 'replace' ? 'replaceState' : 'pushState';
        const cursor = mode === 'replace' ? this.cursor : ++this.cursor;
        this.historyAdapter[method](this.buildState(options.href, mode, cursor, options), options.href);
    }
    buildState(href, mode, cursor, options) {
        const state = {
            source: 'naja',
            cursor,
            href,
        };
        this.dispatchEvent(new CustomEvent('buildState', {
            detail: {
                state,
                operation: mode === 'replace' ? 'replaceState' : 'pushState',
                options,
            },
        }));
        return state;
    }
}

class SnippetCache extends EventTarget {
    constructor(naja) {
        super();
        this.naja = naja;
        this.currentSnippets = new Map();
        this.storages = {
            off: new OffCacheStorage(naja),
            history: new HistoryCacheStorage(),
            session: new SessionCacheStorage(),
        };
        naja.addEventListener('init', this.initializeIndex.bind(this));
        naja.snippetHandler.addEventListener('pendingUpdate', this.updateIndex.bind(this));
        naja.uiHandler.addEventListener('interaction', this.configureCache.bind(this));
        naja.historyHandler.addEventListener('buildState', this.buildHistoryState.bind(this));
        naja.historyHandler.addEventListener('restoreState', this.restoreHistoryState.bind(this));
    }
    resolveStorage(option) {
        let storageType;
        if (option === true || option === undefined) {
            storageType = 'history';
        }
        else if (option === false) {
            storageType = 'off';
        }
        else {
            storageType = option;
        }
        return this.storages[storageType];
    }
    static shouldCacheSnippet(snippet) {
        return !snippet.hasAttribute('data-naja-history-nocache')
            && !snippet.hasAttribute('data-history-nocache')
            && (!snippet.hasAttribute('data-naja-snippet-cache')
                || snippet.getAttribute('data-naja-snippet-cache') !== 'off');
    }
    initializeIndex() {
        onDomReady(() => {
            const currentSnippets = SnippetHandler.findSnippets(SnippetCache.shouldCacheSnippet);
            this.currentSnippets = new Map(Object.entries(currentSnippets));
        });
    }
    updateIndex(event) {
        const { snippet, content, operation } = event.detail;
        if (!SnippetCache.shouldCacheSnippet(snippet)) {
            return;
        }
        const currentContent = this.currentSnippets.get(snippet.id) ?? '';
        const updateIndex = typeof operation === 'object'
            ? operation.updateIndex
            : () => content;
        this.currentSnippets.set(snippet.id, updateIndex(currentContent, content));
        // update nested snippets
        const snippetContent = SnippetCache.parser.parseFromString(content, 'text/html');
        const nestedSnippets = SnippetHandler.findSnippets(SnippetCache.shouldCacheSnippet, snippetContent);
        for (const [id, content] of Object.entries(nestedSnippets)) {
            this.currentSnippets.set(id, content);
        }
    }
    configureCache(event) {
        const { element, options } = event.detail;
        if (!element) {
            return;
        }
        if (element.hasAttribute('data-naja-snippet-cache') || element.form?.hasAttribute('data-naja-snippet-cache')
            || element.hasAttribute('data-naja-history-cache') || element.form?.hasAttribute('data-naja-history-cache')) {
            const value = element.getAttribute('data-naja-snippet-cache')
                ?? element.form?.getAttribute('data-naja-snippet-cache')
                ?? element.getAttribute('data-naja-history-cache')
                ?? element.form?.getAttribute('data-naja-history-cache');
            options.snippetCache = value;
        }
    }
    buildHistoryState(event) {
        const { state, options } = event.detail;
        if ('historyUiCache' in options) {
            console.warn('Naja: options.historyUiCache is deprecated, use options.snippetCache instead.');
            options.snippetCache = options.historyUiCache;
        }
        const presentSnippetIds = Object.keys(SnippetHandler.findSnippets(SnippetCache.shouldCacheSnippet));
        const snippets = Object.fromEntries(Array.from(this.currentSnippets).filter(([id]) => presentSnippetIds.includes(id)));
        if (!this.dispatchEvent(new CustomEvent('store', { cancelable: true, detail: { snippets, state, options } }))) {
            return;
        }
        const storage = this.resolveStorage(options.snippetCache);
        state.snippets = {
            storage: storage.type,
            key: storage.store(snippets),
        };
    }
    restoreHistoryState(event) {
        const { state, options } = event.detail;
        if (state.snippets === undefined) {
            return;
        }
        options.snippetCache = state.snippets.storage;
        if (!this.dispatchEvent(new CustomEvent('fetch', { cancelable: true, detail: { state, options } }))) {
            return;
        }
        const storage = this.resolveStorage(options.snippetCache);
        const snippets = storage.fetch(state.snippets.key, state, options);
        if (snippets === null) {
            return;
        }
        if (!this.dispatchEvent(new CustomEvent('restore', { cancelable: true, detail: { snippets, state, options } }))) {
            return;
        }
        this.naja.snippetHandler.updateSnippets(snippets, true, options);
    }
}
SnippetCache.parser = new DOMParser();
class OffCacheStorage {
    constructor(naja) {
        this.naja = naja;
        this.type = 'off';
    } // eslint-disable-line no-empty-function
    store() {
        return null;
    }
    fetch(key, state, options) {
        this.naja.makeRequest('GET', state.href, null, {
            ...options,
            history: false,
            snippetCache: false,
        });
        return null;
    }
}
class HistoryCacheStorage {
    constructor() {
        this.type = 'history';
    }
    store(data) {
        return data;
    }
    fetch(key) {
        return key;
    }
}
class SessionCacheStorage {
    constructor() {
        this.type = 'session';
    }
    store(data) {
        const key = Math.random().toString(36).substring(2, 8);
        window.sessionStorage.setItem(key, JSON.stringify(data));
        return key;
    }
    fetch(key) {
        const data = window.sessionStorage.getItem(key);
        if (data === null) {
            return null;
        }
        return JSON.parse(data);
    }
}

class ScriptLoader {
    constructor(naja) {
        this.naja = naja;
        this.loadedScripts = new Set();
        naja.addEventListener('init', this.initialize.bind(this));
    }
    initialize() {
        onDomReady(() => {
            document.querySelectorAll('script[data-naja-script-id]').forEach((script) => {
                const scriptId = script.getAttribute('data-naja-script-id');
                if (scriptId !== null && scriptId !== '') {
                    this.loadedScripts.add(scriptId);
                }
            });
        });
        this.naja.snippetHandler.addEventListener('afterUpdate', (event) => {
            const { content } = event.detail;
            this.loadScripts(content);
        });
    }
    loadScripts(snippetsOrSnippet) {
        if (typeof snippetsOrSnippet === 'string') {
            this.loadScriptsInSnippet(snippetsOrSnippet);
            return;
        }
        Object.keys(snippetsOrSnippet).forEach((id) => {
            const content = snippetsOrSnippet[id];
            this.loadScriptsInSnippet(content);
        });
    }
    loadScriptsInSnippet(content) {
        if (!/<script/i.test(content)) {
            return;
        }
        const snippetContent = ScriptLoader.parser.parseFromString(content, 'text/html');
        const scripts = snippetContent.querySelectorAll('script');
        scripts.forEach((script) => {
            const scriptId = script.getAttribute('data-naja-script-id');
            if (scriptId !== null && scriptId !== '' && this.loadedScripts.has(scriptId)) {
                return;
            }
            const scriptEl = window.document.createElement('script');
            scriptEl.innerHTML = script.innerHTML;
            if (script.hasAttributes()) {
                for (const attribute of script.attributes) {
                    scriptEl.setAttribute(attribute.name, attribute.value);
                }
            }
            window.document.head.appendChild(scriptEl)
                .parentNode.removeChild(scriptEl);
            if (scriptId !== null && scriptId !== '') {
                this.loadedScripts.add(scriptId);
            }
        });
    }
}
ScriptLoader.parser = new DOMParser();

class Naja extends EventTarget {
    constructor(uiHandler, redirectHandler, snippetHandler, formsHandler, historyHandler, snippetCache, scriptLoader) {
        super();
        this.VERSION = 3;
        this.initialized = false;
        this.extensions = [];
        this.defaultOptions = {};
        this.uiHandler = new (uiHandler ?? UIHandler)(this);
        this.redirectHandler = new (redirectHandler ?? RedirectHandler)(this);
        this.snippetHandler = new (snippetHandler ?? SnippetHandler)(this);
        this.formsHandler = new (formsHandler ?? FormsHandler)(this);
        this.historyHandler = new (historyHandler ?? HistoryHandler)(this);
        this.snippetCache = new (snippetCache ?? SnippetCache)(this);
        this.scriptLoader = new (scriptLoader ?? ScriptLoader)(this);
    }
    registerExtension(extension) {
        if (this.initialized) {
            extension.initialize(this);
        }
        this.extensions.push(extension);
    }
    initialize(defaultOptions = {}) {
        if (this.initialized) {
            throw new Error('Cannot initialize Naja, it is already initialized.');
        }
        this.defaultOptions = this.prepareOptions(defaultOptions);
        this.extensions.forEach((extension) => extension.initialize(this));
        this.dispatchEvent(new CustomEvent('init', { detail: { defaultOptions: this.defaultOptions } }));
        this.initialized = true;
    }
    prepareOptions(options) {
        return {
            ...this.defaultOptions,
            ...options,
            fetch: {
                ...this.defaultOptions.fetch,
                ...options?.fetch,
            },
        };
    }
    async makeRequest(method, url, data = null, options = {}) {
        // normalize url to instanceof URL
        if (typeof url === 'string') {
            url = new URL(url, location.href);
        }
        options = this.prepareOptions(options);
        const headers = new Headers(options.fetch.headers || {});
        const body = this.transformData(url, method, data);
        const abortController = new AbortController();
        const request = new Request(url.toString(), {
            credentials: 'same-origin',
            ...options.fetch,
            method,
            headers,
            body,
            signal: abortController.signal,
        });
        // impersonate XHR so that Nette can detect isAjax()
        request.headers.set('X-Requested-With', 'XMLHttpRequest');
        // hint the server that Naja expects response to be JSON
        request.headers.set('Accept', 'application/json');
        if (!this.dispatchEvent(new CustomEvent('before', { cancelable: true, detail: { request, method, url: url.toString(), data, options } }))) {
            return {};
        }
        const promise = window.fetch(request);
        this.dispatchEvent(new CustomEvent('start', { detail: { request, promise, abortController, options } }));
        let response, payload;
        try {
            response = await promise;
            if (!response.ok) {
                throw new HttpError(response);
            }
            payload = await response.json();
        }
        catch (error) {
            if (error.name === 'AbortError') {
                this.dispatchEvent(new CustomEvent('abort', { detail: { request, error, options } }));
                this.dispatchEvent(new CustomEvent('complete', { detail: { request, response, payload: undefined, error, options } }));
                return {};
            }
            this.dispatchEvent(new CustomEvent('error', { detail: { request, response, error, options } }));
            this.dispatchEvent(new CustomEvent('complete', { detail: { request, response, payload: undefined, error, options } }));
            throw error;
        }
        this.dispatchEvent(new CustomEvent('payload', { detail: { request, response, payload, options } }));
        this.dispatchEvent(new CustomEvent('success', { detail: { request, response, payload, options } }));
        this.dispatchEvent(new CustomEvent('complete', { detail: { request, response, payload, error: undefined, options } }));
        return payload;
    }
    appendToQueryString(searchParams, key, value) {
        if (value === null || value === undefined) {
            return;
        }
        if (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype) {
            for (const [subkey, subvalue] of Object.entries(value)) {
                this.appendToQueryString(searchParams, `${key}[${subkey}]`, subvalue);
            }
        }
        else {
            searchParams.append(key, String(value));
        }
    }
    transformData(url, method, data) {
        const isGet = ['GET', 'HEAD'].includes(method.toUpperCase());
        // sending a form via GET -> serialize FormData into URL and return empty request body
        if (isGet && data instanceof FormData) {
            for (const [key, value] of data) {
                if (value !== null && value !== undefined) {
                    url.searchParams.append(key, String(value));
                }
            }
            return null;
        }
        // sending a POJO -> serialize it recursively into URLSearchParams
        const isDataPojo = data !== null && Object.getPrototypeOf(data) === Object.prototype;
        if (isDataPojo || Array.isArray(data)) {
            // for GET requests, append values to URL and return empty request body
            // otherwise build `new URLSearchParams()` to act as the request body
            const transformedData = isGet ? url.searchParams : new URLSearchParams();
            for (const [key, value] of Object.entries(data)) {
                this.appendToQueryString(transformedData, key, value);
            }
            return isGet
                ? null
                : transformedData;
        }
        return data;
    }
}
class HttpError extends Error {
    constructor(response) {
        const message = `HTTP ${response.status}: ${response.statusText}`;
        super(message);
        this.name = this.constructor.name;
        this.stack = new Error(message).stack;
        this.response = response;
    }
}

class AbortExtension {
    constructor() {
        this.abortControllers = new Set();
    }
    initialize(naja) {
        naja.uiHandler.addEventListener('interaction', this.checkAbortable.bind(this));
        naja.addEventListener('init', this.onInitialize.bind(this));
        naja.addEventListener('start', this.saveAbortController.bind(this));
        naja.addEventListener('complete', this.removeAbortController.bind(this));
    }
    onInitialize() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !(event.ctrlKey || event.shiftKey || event.altKey || event.metaKey)) {
                for (const controller of this.abortControllers) {
                    controller.abort();
                }
                this.abortControllers.clear();
            }
        });
    }
    checkAbortable(event) {
        const { element, options } = event.detail;
        if (element.hasAttribute('data-naja-abort') || element.form?.hasAttribute('data-naja-abort')) {
            options.abort = (element.getAttribute('data-naja-abort') ?? element.form?.getAttribute('data-naja-abort')) !== 'off';
        }
    }
    saveAbortController(event) {
        const { abortController, options } = event.detail;
        if (options.abort !== false) {
            this.abortControllers.add(abortController);
            options.clearAbortExtension = () => this.abortControllers.delete(abortController);
        }
    }
    removeAbortController(event) {
        const { options } = event.detail;
        if (options.abort !== false && !!options.clearAbortExtension) {
            options.clearAbortExtension();
        }
    }
}

class UniqueExtension {
    constructor() {
        this.abortControllers = new Map();
    }
    initialize(naja) {
        naja.uiHandler.addEventListener('interaction', this.checkUniqueness.bind(this));
        naja.addEventListener('start', this.abortPreviousRequest.bind(this));
        naja.addEventListener('complete', this.clearRequest.bind(this));
    }
    checkUniqueness(event) {
        const { element, options } = event.detail;
        if (element.hasAttribute('data-naja-unique') ?? element.form?.hasAttribute('data-naja-unique')) {
            const unique = element.getAttribute('data-naja-unique') ?? element.form?.getAttribute('data-naja-unique');
            options.unique = unique === 'off' ? false : unique ?? 'default';
        }
    }
    abortPreviousRequest(event) {
        const { abortController, options } = event.detail;
        if (options.unique !== false) {
            this.abortControllers.get(options.unique ?? 'default')?.abort();
            this.abortControllers.set(options.unique ?? 'default', abortController);
        }
    }
    clearRequest(event) {
        const { request, options } = event.detail;
        if (!request.signal.aborted && options.unique !== false) {
            this.abortControllers.delete(options.unique ?? 'default');
        }
    }
}

const naja = new Naja();
naja.registerExtension(new AbortExtension());
naja.registerExtension(new UniqueExtension());


//# sourceMappingURL=Naja.esm.js.map


/***/ }),

/***/ "./node_modules/nette-forms/src/assets/netteForms.js":
/*!***********************************************************!*\
  !*** ./node_modules/nette-forms/src/assets/netteForms.js ***!
  \***********************************************************/
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_RESULT__;/**!
 * NetteForms - simple form validation.
 *
 * This file is part of the Nette Framework (https://nette.org)
 * Copyright (c) 2004 David Grudl (https://davidgrudl.com)
 */

/**
 * @typedef {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement|HTMLButtonElement} FormElement
 * @typedef {{op: string, neg: boolean, msg: string, arg: *, rules: ?Array<Rule>, control: string, toggle: ?Array<string>}} Rule
 */

(function (global, factory) {
	if (!global.JSON) {
		return;
	}

	if (true) {
		!(__WEBPACK_AMD_DEFINE_RESULT__ = (() => factory(global)).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else {}

}(typeof window !== 'undefined' ? window : this, (window) => {
	'use strict';

	const Nette = {};
	let preventFiltering = {};
	let formToggles = {};
	let toggleListeners = new window.WeakMap();

	Nette.formErrors = [];
	Nette.version = '3.3.0';


	/**
	 * @param {HTMLFormElement} form
	 * @param {string} name
	 * @return {?FormElement}
	 */
	function getFormElement(form, name) {
		let res = form.elements.namedItem(name);
		return res instanceof RadioNodeList ? res[0] : res;
	}


	/**
	 * @param {FormElement} elem
	 * @return {Array<FormElement>}
	 */
	function expandRadioElement(elem) {
		let res = elem.form.elements.namedItem(elem.name);
		return res instanceof RadioNodeList ? Array.from(res) : [res];
	}


	/**
	 * Function to execute when the DOM is fully loaded.
	 * @private
	 */
	Nette.onDocumentReady = function (callback) {
		if (document.readyState !== 'loading') {
			callback.call(this);
		} else {
			document.addEventListener('DOMContentLoaded', callback);
		}
	};


	/**
	 * Returns the value of form element.
	 * @param {FormElement|RadioNodeList} elem
	 * @return {*}
	 */
	Nette.getValue = function (elem) {
		if (elem instanceof HTMLInputElement) {
			if (elem.type === 'radio') {
				return expandRadioElement(elem)
					.find((input) => input.checked)
					?.value ?? null;

			} else if (elem.type === 'file') {
				return elem.files;

			} else if (elem.type === 'checkbox') {
				return elem.name.endsWith('[]') // checkbox list
					? expandRadioElement(elem)
						.filter((input) => input.checked)
						.map((input) => input.value)
					: elem.checked;

			} else {
				return elem.value.trim();
			}

		} else if (elem instanceof HTMLSelectElement) {
			return elem.multiple
				? Array.from(elem.selectedOptions, (option) => option.value)
				: elem.selectedOptions[0]?.value ?? null;

		} else if (elem instanceof HTMLTextAreaElement) {
			return elem.value;

		} else if (elem instanceof RadioNodeList) {
			return Nette.getValue(elem[0]);

		} else {
			return null;
		}
	};


	/**
	 * Returns the effective value of form element.
	 * @param {FormElement} elem
	 * @param {boolean} filter
	 * @return {*}
	 */
	Nette.getEffectiveValue = function (elem, filter = false) {
		let val = Nette.getValue(elem);
		if (val === elem.getAttribute('data-nette-empty-value')) {
			val = '';
		}
		if (filter && preventFiltering[elem.name] === undefined) {
			preventFiltering[elem.name] = true;
			let ref = {value: val};
			Nette.validateControl(elem, null, true, ref);
			val = ref.value;
			delete preventFiltering[elem.name];
		}
		return val;
	};


	/**
	 * Validates form element against given rules.
	 * @param {FormElement} elem
	 * @param {?Array<Rule>} rules
	 * @param {boolean} onlyCheck
	 * @param {?{value: *}} value
	 * @param {?boolean} emptyOptional
	 * @return {boolean}
	 */
	Nette.validateControl = function (elem, rules, onlyCheck = false, value = null, emptyOptional = null) {
		rules ??= JSON.parse(elem.getAttribute('data-nette-rules') ?? '[]');
		value ??= {value: Nette.getEffectiveValue(elem)};
		emptyOptional ??= !Nette.validateRule(elem, ':filled', null, value);

		for (let rule of rules) {
			let op = rule.op.match(/(~)?([^?]+)/),
				curElem = rule.control ? getFormElement(elem.form, rule.control) : elem;

			rule.neg = op[1];
			rule.op = op[2];
			rule.condition = !!rule.rules;

			if (!curElem) {
				continue;
			} else if (emptyOptional && !rule.condition && rule.op !== ':filled') {
				continue;
			}

			let success = Nette.validateRule(curElem, rule.op, rule.arg, elem === curElem ? value : undefined);
			if (success === null) {
				continue;
			} else if (rule.neg) {
				success = !success;
			}

			if (rule.condition && success) {
				if (!Nette.validateControl(elem, rule.rules, onlyCheck, value, rule.op === ':blank' ? false : emptyOptional)) {
					return false;
				}
			} else if (!rule.condition && !success) {
				if (Nette.isDisabled(curElem)) {
					continue;
				}
				if (!onlyCheck) {
					let arr = Array.isArray(rule.arg) ? rule.arg : [rule.arg],
						message = rule.msg.replace(
							/%(value|\d+)/g,
							(foo, m) => Nette.getValue(m === 'value' ? curElem : elem.form.elements.namedItem(arr[m].control))
						);
					Nette.addError(curElem, message);
				}
				return false;
			}
		}

		return true;
	};


	/**
	 * Validates whole form.
	 * @param {HTMLFormElement} sender
	 * @param {boolean} onlyCheck
	 * @return {boolean}
	 */
	Nette.validateForm = function (sender, onlyCheck = false) {
		let form = sender.form ?? sender,
			scope;

		Nette.formErrors = [];

		if (form['nette-submittedBy'] && form['nette-submittedBy'].getAttribute('formnovalidate') !== null) {
			let scopeArr = JSON.parse(form['nette-submittedBy'].getAttribute('data-nette-validation-scope') ?? '[]');
			if (scopeArr.length) {
				scope = new RegExp('^(' + scopeArr.join('-|') + '-)');
			} else {
				Nette.showFormErrors(form, []);
				return true;
			}
		}

		for (let elem of form.elements) {
			if (elem.willValidate && elem.validity.badInput) {
				elem.reportValidity();
				return false;
			}
		}

		for (let elem of Array.from(form.elements)) {
			if (elem.getAttribute('data-nette-rules')
				&& (!scope || elem.name.replace(/]\[|\[|]|$/g, '-').match(scope))
				&& !Nette.isDisabled(elem)
				&& !Nette.validateControl(elem, null, onlyCheck)
				&& !Nette.formErrors.length
			) {
				return false;
			}
		}

		let success = !Nette.formErrors.length;
		Nette.showFormErrors(form, Nette.formErrors);
		return success;
	};


	/**
	 * Check if input is disabled.
	 * @param {FormElement} elem
	 * @return {boolean}
	 */
	Nette.isDisabled = function (elem) {
		if (elem.type === 'radio') {
			return expandRadioElement(elem)
				.every((input) => input.disabled);
		}
		return elem.disabled;
	};


	/**
	 * Adds error message to the queue.
	 * @param {FormElement} elem
	 * @param {string} message
	 */
	Nette.addError = function (elem, message) {
		Nette.formErrors.push({
			element: elem,
			message: message
		});
	};


	/**
	 * Display error messages.
	 * @param {HTMLFormElement} form
	 * @param {Array<{element: FormElement, message: string}>} errors
	 */
	Nette.showFormErrors = function (form, errors) {
		let messages = [],
			focusElem;

		for (let error of errors) {
			if (messages.indexOf(error.message) < 0) {
				messages.push(error.message);

				if (!focusElem && error.element.focus) {
					focusElem = error.element;
				}
			}
		}

		if (messages.length) {
			Nette.showModal(messages.join('\n'), () => {
				if (focusElem) {
					focusElem.focus();
				}
			});
		}
	};


	/**
	 * Display modal window.
	 * @param {string} message
	 * @param {function} onclose
	 */
	Nette.showModal = function (message, onclose) {
		let dialog = document.createElement('dialog');

		if (!dialog.showModal) {
			alert(message);
			onclose();
			return;
		}

		let style = document.createElement('style');
		style.innerText = '.netteFormsModal { text-align: center; margin: auto; border: 2px solid black; padding: 1rem } .netteFormsModal button { padding: .1em 2em }';

		let button = document.createElement('button');
		button.innerText = 'OK';
		button.onclick = () => {
			dialog.remove();
			onclose();
		};

		dialog.setAttribute('class', 'netteFormsModal');
		dialog.innerText = message + '\n\n';
		dialog.append(style, button);
		document.body.append(dialog);
		dialog.showModal();
	};


	/**
	 * Validates single rule.
	 * @param {FormElement} elem
	 * @param {string} op
	 * @param {*} arg
	 * @param {?{value: *}} value
	 */
	Nette.validateRule = function (elem, op, arg, value) {
		if (elem.validity.badInput) {
			return op === ':filled';
		}

		value ??= {value: Nette.getEffectiveValue(elem, true)};

		let method = op.charAt(0) === ':' ? op.substring(1) : op;
		method = method.replace('::', '_').replaceAll('\\', '');

		let args = Array.isArray(arg) ? arg : [arg];
		args = args.map((arg) => {
			if (arg?.control) {
				let control = getFormElement(elem.form, arg.control);
				return control === elem ? value.value : Nette.getEffectiveValue(control, true);
			}
			return arg;
		});

		return Nette.validators[method]
			? Nette.validators[method](elem, Array.isArray(arg) ? args : args[0], value.value, value)
			: null;
	};


	Nette.validators = {
		filled: function (elem, arg, val) {
			return val !== '' && val !== false && val !== null
				&& (!Array.isArray(val) || !!val.length)
				&& (!(val instanceof FileList) || val.length);
		},

		blank: function (elem, arg, val) {
			return !Nette.validators.filled(elem, arg, val);
		},

		valid: function (elem) {
			return Nette.validateControl(elem, null, true);
		},

		equal: function (elem, arg, val) {
			if (arg === undefined) {
				return null;
			}

			let toString = (val) => {
				if (typeof val === 'number' || typeof val === 'string') {
					return '' + val;
				} else {
					return val === true ? '1' : '';
				}
			};

			val = Array.isArray(val) ? val : [val];
			arg = Array.isArray(arg) ? arg : [arg];
			loop:
			for (let a of val) {
				for (let b of arg) {
					if (toString(a) === toString(b)) {
						continue loop;
					}
				}
				return false;
			}
			return val.length > 0;
		},

		notEqual: function (elem, arg, val) {
			return arg === undefined ? null : !Nette.validators.equal(elem, arg, val);
		},

		minLength: function (elem, arg, val) {
			val = typeof val === 'number' ? val.toString() : val;
			return val.length >= arg;
		},

		maxLength: function (elem, arg, val) {
			val = typeof val === 'number' ? val.toString() : val;
			return val.length <= arg;
		},

		length: function (elem, arg, val) {
			val = typeof val === 'number' ? val.toString() : val;
			arg = Array.isArray(arg) ? arg : [arg, arg];
			return (arg[0] === null || val.length >= arg[0]) && (arg[1] === null || val.length <= arg[1]);
		},

		email: function (elem, arg, val) {
			return (/^("([ !#-[\]-~]|\\[ -~])+"|[-a-z0-9!#$%&'*+/=?^_`{|}~]+(\.[-a-z0-9!#$%&'*+/=?^_`{|}~]+)*)@([0-9a-z\u00C0-\u02FF\u0370-\u1EFF]([-0-9a-z\u00C0-\u02FF\u0370-\u1EFF]{0,61}[0-9a-z\u00C0-\u02FF\u0370-\u1EFF])?\.)+[a-z\u00C0-\u02FF\u0370-\u1EFF]([-0-9a-z\u00C0-\u02FF\u0370-\u1EFF]{0,17}[a-z\u00C0-\u02FF\u0370-\u1EFF])?$/i).test(val);
		},

		url: function (elem, arg, val, newValue) {
			if (!(/^[a-z\d+.-]+:/).test(val)) {
				val = 'https://' + val;
			}
			if ((/^https?:\/\/((([-_0-9a-z\u00C0-\u02FF\u0370-\u1EFF]+\.)*[0-9a-z\u00C0-\u02FF\u0370-\u1EFF]([-0-9a-z\u00C0-\u02FF\u0370-\u1EFF]{0,61}[0-9a-z\u00C0-\u02FF\u0370-\u1EFF])?\.)?[a-z\u00C0-\u02FF\u0370-\u1EFF]([-0-9a-z\u00C0-\u02FF\u0370-\u1EFF]{0,17}[a-z\u00C0-\u02FF\u0370-\u1EFF])?|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[[0-9a-f:]{3,39}\])(:\d{1,5})?(\/\S*)?$/i).test(val)) {
				newValue.value = val;
				return true;
			}
			return false;
		},

		regexp: function (elem, arg, val) {
			let parts = typeof arg === 'string' ? arg.match(/^\/(.*)\/([imu]*)$/) : false;
			try {
				return parts && (new RegExp(parts[1], parts[2].replace('u', ''))).test(val);
			} catch {} // eslint-disable-line no-empty
		},

		pattern: function (elem, arg, val, newValue, caseInsensitive) {
			if (typeof arg !== 'string') {
				return null;
			}

			try {
				let regExp;
				try {
					regExp = new RegExp('^(?:' + arg + ')$', caseInsensitive ? 'ui' : 'u');
				} catch {
					regExp = new RegExp('^(?:' + arg + ')$', caseInsensitive ? 'i' : '');
				}

				return val instanceof FileList
					? Array.from(val).every((file) => regExp.test(file.name))
					: regExp.test(val);
			} catch {} // eslint-disable-line no-empty
		},

		patternCaseInsensitive: function (elem, arg, val) {
			return Nette.validators.pattern(elem, arg, val, null, true);
		},

		numeric: function (elem, arg, val) {
			return (/^[0-9]+$/).test(val);
		},

		integer: function (elem, arg, val, newValue) {
			if ((/^-?[0-9]+$/).test(val)) {
				newValue.value = parseFloat(val);
				return true;
			}
			return false;
		},

		'float': function (elem, arg, val, newValue) {
			val = val.replace(/ +/g, '').replace(/,/g, '.');
			if ((/^-?[0-9]*\.?[0-9]+$/).test(val)) {
				newValue.value = parseFloat(val);
				return true;
			}
			return false;
		},

		min: function (elem, arg, val) {
			if (Number.isFinite(arg)) {
				val = parseFloat(val);
			}
			return val >= arg;
		},

		max: function (elem, arg, val) {
			if (Number.isFinite(arg)) {
				val = parseFloat(val);
			}
			return val <= arg;
		},

		range: function (elem, arg, val) {
			if (!Array.isArray(arg)) {
				return null;
			} else if (elem.type === 'time' && arg[0] > arg[1]) {
				return val >= arg[0] || val <= arg[1];
			}
			return (arg[0] === null || Nette.validators.min(elem, arg[0], val))
				&& (arg[1] === null || Nette.validators.max(elem, arg[1], val));
		},

		submitted: function (elem) {
			return elem.form['nette-submittedBy'] === elem;
		},

		fileSize: function (elem, arg, val) {
			return Array.from(val).every((file) => file.size <= arg);
		},

		mimeType: function (elem, args, val) {
			let re = [];
			args = Array.isArray(args) ? args : [args];
			args.forEach((arg) => re.push('^' + arg.replace(/([^\w])/g, '\\$1').replace('\\*', '.*') + '$'));
			re = new RegExp(re.join('|'));
			return Array.from(val).every((file) => !file.type || re.test(file.type));
		},

		image: function (elem, arg, val) {
			return Nette.validators.mimeType(elem, arg ?? ['image/gif', 'image/png', 'image/jpeg', 'image/webp'], val);
		},

		'static': function (elem, arg) {
			return arg;
		}
	};


	/**
	 * Process all toggles in form.
	 * @param {HTMLFormElement} form
	 * @param {?Event} event
	 */
	Nette.toggleForm = function (form, event = null) {
		formToggles = {};
		for (let elem of Array.from(form.elements)) {
			if (elem.getAttribute('data-nette-rules')) {
				Nette.toggleControl(elem, null, null, !event);
			}
		}

		for (let i in formToggles) {
			Nette.toggle(i, formToggles[i].state, formToggles[i].elem, event);
		}
	};


	/**
	 * Process toggles on form element.
	 * @param {FormElement} elem
	 * @param {?Array<Rule>} rules
	 * @param {?boolean} success
	 * @param {boolean} firsttime
	 * @param {?{value: *}} value
	 * @param {?boolean} emptyOptional
	 * @return {boolean}
	 */
	Nette.toggleControl = function (elem, rules, success, firsttime, value = null, emptyOptional = null) {
		rules ??= JSON.parse(elem.getAttribute('data-nette-rules') ?? '[]');
		value ??= {value: Nette.getEffectiveValue(elem)};
		emptyOptional ??= !Nette.validateRule(elem, ':filled', null, value);

		let has = false,
			curSuccess;

		for (let rule of rules) {
			let op = rule.op.match(/(~)?([^?]+)/),
				curElem = rule.control ? getFormElement(elem.form, rule.control) : elem;

			rule.neg = op[1];
			rule.op = op[2];
			rule.condition = !!rule.rules;

			if (!curElem) {
				continue;
			} else if (emptyOptional && !rule.condition && rule.op !== ':filled') {
				continue;
			}

			curSuccess = success;
			if (success !== false) {
				curSuccess = Nette.validateRule(curElem, rule.op, rule.arg, elem === curElem ? value : undefined);
				if (curSuccess === null) {
					continue;

				} else if (rule.neg) {
					curSuccess = !curSuccess;
				}
				if (!rule.condition) {
					success = curSuccess;
				}
			}

			if ((rule.condition && Nette.toggleControl(elem, rule.rules, curSuccess, firsttime, value, rule.op === ':blank' ? false : emptyOptional)) || rule.toggle) {
				has = true;
				if (firsttime) {
					expandRadioElement(curElem)
						.filter((el) => !toggleListeners.has(el))
						.forEach((el) => {
							el.addEventListener('change', (e) => Nette.toggleForm(elem.form, e));
							toggleListeners.set(el, null);
						});
				}
				for (let id in rule.toggle ?? []) {
					formToggles[id] ??= {elem: elem};
					formToggles[id].state ||= rule.toggle[id] ? curSuccess : !curSuccess;
				}
			}
		}
		return has;
	};


	/**
	 * Displays or hides HTML element.
	 * @param {string} selector
	 * @param {boolean} visible
	 * @param {FormElement} srcElement
	 * @param {Event} event
	 */
	Nette.toggle = function (selector, visible, srcElement, event) { // eslint-disable-line no-unused-vars
		if (/^\w[\w.:-]*$/.test(selector)) { // id
			selector = '#' + selector;
		}
		Array.from(document.querySelectorAll(selector))
			.forEach((elem) => elem.hidden = !visible);
	};


	/**
	 * Compact checkboxes
	 * @param {HTMLFormElement} form
	 * @param {FormData} formData
	 */
	Nette.compactCheckboxes = function (form, formData) {
		let values = {};

		for (let elem of form.elements) {
			if (elem instanceof HTMLInputElement && elem.type === 'checkbox' && elem.name.endsWith('[]') && elem.checked && !elem.disabled) {
				formData.delete(elem.name);
				values[elem.name] ??= [];
				values[elem.name].push(elem.value);
			}
		}

		for (let name in values) {
			formData.set(name.substring(0, name.length - 2), values[name].join(','));
		}
	};


	/**
	 * Setup handlers.
	 * @param {HTMLFormElement} form
	 */
	Nette.initForm = function (form) {
		if (form.method === 'get' && form.hasAttribute('data-nette-compact')) {
			form.addEventListener('formdata', (e) => Nette.compactCheckboxes(form, e.formData));
		}

		if (!Array.from(form.elements).some((elem) => elem.getAttribute('data-nette-rules'))) {
			return;
		}

		Nette.toggleForm(form);

		if (form.noValidate) {
			return;
		}
		form.noValidate = true;

		form.addEventListener('submit', (e) => {
			if (!Nette.validateForm(form)) {
				e.stopPropagation();
				e.preventDefault();
			}
		});

		form.addEventListener('reset', () => {
			setTimeout(() => Nette.toggleForm(form));
		});
	};


	/**
	 * @private
	 */
	Nette.initOnLoad = function () {
		Nette.onDocumentReady(() => {
			Array.from(document.forms)
				.forEach((form) => Nette.initForm(form));

			document.body.addEventListener('click', (e) => {
				let target = e.target;
				while (target) {
					if (target.form && target.type in {submit: 1, image: 1}) {
						target.form['nette-submittedBy'] = target;
						break;
					}
					target = target.parentNode;
				}
			});
		});
	};


	/**
	 * Converts string to web safe characters [a-z0-9-] text.
	 * @param {string} s
	 * @return {string}
	 */
	Nette.webalize = function (s) {
		s = s.toLowerCase();
		let res = '', ch;
		for (let i = 0; i < s.length; i++) {
			ch = Nette.webalizeTable[s.charAt(i)];
			res += ch ? ch : s.charAt(i);
		}
		return res.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	};

	Nette.webalizeTable = {\u00e1: 'a', \u00e4: 'a', \u010d: 'c', \u010f: 'd', \u00e9: 'e', \u011b: 'e', \u00ed: 'i', \u013e: 'l', \u0148: 'n', \u00f3: 'o', \u00f4: 'o', \u0159: 'r', \u0161: 's', \u0165: 't', \u00fa: 'u', \u016f: 'u', \u00fd: 'y', \u017e: 'z'};

	return Nette;
}));


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!***********************!*\
  !*** ./www/js/app.js ***!
  \***********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var naja__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! naja */ "./node_modules/naja/dist/Naja.esm.js");
/* harmony import */ var nette_forms__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! nette-forms */ "./node_modules/nette-forms/src/assets/netteForms.js");
/* harmony import */ var nette_forms__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(nette_forms__WEBPACK_IMPORTED_MODULE_1__);



window.Nette = (nette_forms__WEBPACK_IMPORTED_MODULE_1___default());

document.addEventListener('DOMContentLoaded', naja__WEBPACK_IMPORTED_MODULE_0__["default"].initialize.bind(naja__WEBPACK_IMPORTED_MODULE_0__["default"]));
nette_forms__WEBPACK_IMPORTED_MODULE_1___default().initOnLoad();
})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUztBQUNUO0FBQ0Esb0JBQW9CLFVBQVU7QUFDOUI7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0NBQWtDO0FBQ2xDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxREFBcUQsVUFBVSx1Q0FBdUM7QUFDdEc7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQSw0REFBNEQ7QUFDNUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtEQUErRDtBQUMvRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7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TjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0EsOERBQThELEVBQUUsNkJBQTZCLEVBQUUsK0VBQStFLEtBQUssNEdBQTRHLEtBQUs7QUFDcFMsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3SUFBd0ksS0FBSyw0R0FBNEcsS0FBSyxxQ0FBcUMsSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSSxhQUFhLEtBQUssUUFBUSxJQUFJO0FBQ2hXO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLLFNBQVM7QUFDZCxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSyxTQUFTO0FBQ2QsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVksaUJBQWlCO0FBQzdCLFlBQVksUUFBUTtBQUNwQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWSxhQUFhO0FBQ3pCLFlBQVksY0FBYztBQUMxQixZQUFZLFVBQVU7QUFDdEIsWUFBWSxTQUFTO0FBQ3JCLFlBQVksRUFBRSxXQUFXO0FBQ3pCLFlBQVksVUFBVTtBQUN0QixhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQSwwQkFBMEI7QUFDMUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLFFBQVE7QUFDcEIsWUFBWSxTQUFTO0FBQ3JCLFlBQVksYUFBYTtBQUN6QixZQUFZLE9BQU87QUFDbkI7QUFDQSxrRUFBa0U7QUFDbEUsdUNBQXVDO0FBQ3ZDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVksaUJBQWlCO0FBQzdCLFlBQVksVUFBVTtBQUN0QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWSxpQkFBaUI7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3Q0FBd0Msb0JBQW9CO0FBQzVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0osR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLFFBQVE7QUFDcEIsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0JBQWtCLGNBQWM7QUFDaEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCO0FBQ3hCO0FBQ0E7QUFDQSxDQUFDOzs7Ozs7O1VDbnVCRDtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7OztXQ3RCQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EsaUNBQWlDLFdBQVc7V0FDNUM7V0FDQTs7Ozs7V0NQQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLHlDQUF5Qyx3Q0FBd0M7V0FDakY7V0FDQTtXQUNBOzs7OztXQ1BBOzs7OztXQ0FBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RDs7Ozs7Ozs7Ozs7Ozs7O0FDTndCO0FBQ2E7O0FBRXJDLGVBQWUsb0RBQVU7O0FBRXpCLDhDQUE4Qyw0Q0FBSSxpQkFBaUIsNENBQUk7QUFDdkUsNkRBQXFCLEciLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9uZXR0ZS1ibG9nLy4vbm9kZV9tb2R1bGVzL25hamEvZGlzdC9OYWphLmVzbS5qcyIsIndlYnBhY2s6Ly9uZXR0ZS1ibG9nLy4vbm9kZV9tb2R1bGVzL25ldHRlLWZvcm1zL3NyYy9hc3NldHMvbmV0dGVGb3Jtcy5qcyIsIndlYnBhY2s6Ly9uZXR0ZS1ibG9nL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL25ldHRlLWJsb2cvd2VicGFjay9ydW50aW1lL2NvbXBhdCBnZXQgZGVmYXVsdCBleHBvcnQiLCJ3ZWJwYWNrOi8vbmV0dGUtYmxvZy93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vbmV0dGUtYmxvZy93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL25ldHRlLWJsb2cvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9uZXR0ZS1ibG9nLy4vd3d3L2pzL2FwcC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTmFqYS5qc1xuICogMy4xLjBcbiAqXG4gKiBieSBKacWZw60gUHVkaWwgPGh0dHBzOi8vamlyaXB1ZGlsLmN6PlxuICovXG4vLyByZWFkeVxuY29uc3Qgb25Eb21SZWFkeSA9IChjYWxsYmFjaykgPT4ge1xuICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnbG9hZGluZycpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGNhbGxiYWNrKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxufTtcbi8vIGFzc2VydFxuY2xhc3MgQXNzZXJ0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG59XG5jb25zdCBhc3NlcnQgPSAoY29uZGl0aW9uLCBkZXNjcmlwdGlvbikgPT4ge1xuICAgIGlmICghY29uZGl0aW9uKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgQXNzZXJ0aW9uIGZhaWxlZCR7ZGVzY3JpcHRpb24gIT09IHVuZGVmaW5lZCA/IGA6ICR7ZGVzY3JpcHRpb259YCA6ICcuJ31gO1xuICAgICAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobWVzc2FnZSk7XG4gICAgfVxufTtcblxuY2xhc3MgVUlIYW5kbGVyIGV4dGVuZHMgRXZlbnRUYXJnZXQge1xuICAgIGNvbnN0cnVjdG9yKG5hamEpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5uYWphID0gbmFqYTtcbiAgICAgICAgdGhpcy5zZWxlY3RvciA9ICcuYWpheCc7XG4gICAgICAgIHRoaXMuYWxsb3dlZE9yaWdpbnMgPSBbd2luZG93LmxvY2F0aW9uLm9yaWdpbl07XG4gICAgICAgIHRoaXMuaGFuZGxlciA9IHRoaXMuaGFuZGxlVUkuYmluZCh0aGlzKTtcbiAgICAgICAgbmFqYS5hZGRFdmVudExpc3RlbmVyKCdpbml0JywgdGhpcy5pbml0aWFsaXplLmJpbmQodGhpcykpO1xuICAgIH1cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBvbkRvbVJlYWR5KCgpID0+IHRoaXMuYmluZFVJKHdpbmRvdy5kb2N1bWVudC5ib2R5KSk7XG4gICAgICAgIHRoaXMubmFqYS5zbmlwcGV0SGFuZGxlci5hZGRFdmVudExpc3RlbmVyKCdhZnRlclVwZGF0ZScsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyBzbmlwcGV0IH0gPSBldmVudC5kZXRhaWw7XG4gICAgICAgICAgICB0aGlzLmJpbmRVSShzbmlwcGV0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGJpbmRVSShlbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHNlbGVjdG9ycyA9IFtcbiAgICAgICAgICAgIGBhJHt0aGlzLnNlbGVjdG9yfWAsXG4gICAgICAgICAgICBgaW5wdXRbdHlwZT1cInN1Ym1pdFwiXSR7dGhpcy5zZWxlY3Rvcn1gLFxuICAgICAgICAgICAgYGlucHV0W3R5cGU9XCJpbWFnZVwiXSR7dGhpcy5zZWxlY3Rvcn1gLFxuICAgICAgICAgICAgYGJ1dHRvblt0eXBlPVwic3VibWl0XCJdJHt0aGlzLnNlbGVjdG9yfWAsXG4gICAgICAgICAgICBgYnV0dG9uW2Zvcm1dOm5vdChbdHlwZV0pJHt0aGlzLnNlbGVjdG9yfWAsXG4gICAgICAgICAgICBgZm9ybSBidXR0b246bm90KFt0eXBlXSkke3RoaXMuc2VsZWN0b3J9YCxcbiAgICAgICAgICAgIGBmb3JtJHt0aGlzLnNlbGVjdG9yfSBpbnB1dFt0eXBlPVwic3VibWl0XCJdYCxcbiAgICAgICAgICAgIGBmb3JtJHt0aGlzLnNlbGVjdG9yfSBpbnB1dFt0eXBlPVwiaW1hZ2VcIl1gLFxuICAgICAgICAgICAgYGZvcm0ke3RoaXMuc2VsZWN0b3J9IGJ1dHRvblt0eXBlPVwic3VibWl0XCJdYCxcbiAgICAgICAgICAgIGBmb3JtJHt0aGlzLnNlbGVjdG9yfSBidXR0b246bm90KFt0eXBlXSlgLFxuICAgICAgICBdLmpvaW4oJywgJyk7XG4gICAgICAgIGNvbnN0IGJpbmRFbGVtZW50ID0gKGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLmhhbmRsZXIpO1xuICAgICAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuaGFuZGxlcik7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGVsZW1lbnRzID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9ycyk7XG4gICAgICAgIGVsZW1lbnRzLmZvckVhY2goKGVsZW1lbnQpID0+IGJpbmRFbGVtZW50KGVsZW1lbnQpKTtcbiAgICAgICAgaWYgKGVsZW1lbnQubWF0Y2hlcyhzZWxlY3RvcnMpKSB7XG4gICAgICAgICAgICBiaW5kRWxlbWVudChlbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBiaW5kRm9ybSA9IChmb3JtKSA9PiB7XG4gICAgICAgICAgICBmb3JtLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIHRoaXMuaGFuZGxlcik7XG4gICAgICAgICAgICBmb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIHRoaXMuaGFuZGxlcik7XG4gICAgICAgIH07XG4gICAgICAgIGlmIChlbGVtZW50Lm1hdGNoZXMoYGZvcm0ke3RoaXMuc2VsZWN0b3J9YCkpIHtcbiAgICAgICAgICAgIGJpbmRGb3JtKGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZvcm1zID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKGBmb3JtJHt0aGlzLnNlbGVjdG9yfWApO1xuICAgICAgICBmb3Jtcy5mb3JFYWNoKChmb3JtKSA9PiBiaW5kRm9ybShmb3JtKSk7XG4gICAgfVxuICAgIGhhbmRsZVVJKGV2ZW50KSB7XG4gICAgICAgIGNvbnN0IG1vdXNlRXZlbnQgPSBldmVudDtcbiAgICAgICAgaWYgKG1vdXNlRXZlbnQuYWx0S2V5IHx8IG1vdXNlRXZlbnQuY3RybEtleSB8fCBtb3VzZUV2ZW50LnNoaWZ0S2V5IHx8IG1vdXNlRXZlbnQubWV0YUtleSB8fCBtb3VzZUV2ZW50LmJ1dHRvbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSBldmVudC5jdXJyZW50VGFyZ2V0O1xuICAgICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5uYWphLnByZXBhcmVPcHRpb25zKCk7XG4gICAgICAgIGNvbnN0IGlnbm9yZUVycm9ycyA9ICgpID0+IHtcbiAgICAgICAgICAgIC8vIGRvbid0IHJlamVjdCB0aGUgcHJvbWlzZSBpbiBjYXNlIG9mIGFuIGVycm9yIGFzIGRldmVsb3BlcnMgaGF2ZSBubyB3YXkgb2YgaGFuZGxpbmcgdGhlIHJlamVjdGlvblxuICAgICAgICAgICAgLy8gaW4gdGhpcyBzaXR1YXRpb247IGVycm9ycyBzaG91bGQgYmUgaGFuZGxlZCBpbiBgbmFqYS5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlcilgXG4gICAgICAgIH07XG4gICAgICAgIGlmIChldmVudC50eXBlID09PSAnc3VibWl0Jykge1xuICAgICAgICAgICAgdGhpcy5zdWJtaXRGb3JtKGVsZW1lbnQsIG9wdGlvbnMsIGV2ZW50KS5jYXRjaChpZ25vcmVFcnJvcnMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGV2ZW50LnR5cGUgPT09ICdjbGljaycpIHtcbiAgICAgICAgICAgIHRoaXMuY2xpY2tFbGVtZW50KGVsZW1lbnQsIG9wdGlvbnMsIG1vdXNlRXZlbnQpLmNhdGNoKGlnbm9yZUVycm9ycyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgYXN5bmMgY2xpY2tFbGVtZW50KGVsZW1lbnQsIG9wdGlvbnMgPSB7fSwgZXZlbnQpIHtcbiAgICAgICAgbGV0IG1ldGhvZCA9ICdHRVQnLCB1cmwgPSAnJywgZGF0YTtcbiAgICAgICAgaWYgKGVsZW1lbnQudGFnTmFtZSA9PT0gJ0EnKSB7XG4gICAgICAgICAgICBhc3NlcnQoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxBbmNob3JFbGVtZW50KTtcbiAgICAgICAgICAgIG1ldGhvZCA9ICdHRVQnO1xuICAgICAgICAgICAgdXJsID0gZWxlbWVudC5ocmVmO1xuICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoZWxlbWVudC50YWdOYW1lID09PSAnSU5QVVQnIHx8IGVsZW1lbnQudGFnTmFtZSA9PT0gJ0JVVFRPTicpIHtcbiAgICAgICAgICAgIGFzc2VydChlbGVtZW50IGluc3RhbmNlb2YgSFRNTElucHV0RWxlbWVudCB8fCBlbGVtZW50IGluc3RhbmNlb2YgSFRNTEJ1dHRvbkVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgeyBmb3JtIH0gPSBlbGVtZW50O1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5lc3RlZC10ZXJuYXJ5LG5vLWV4dHJhLXBhcmVuc1xuICAgICAgICAgICAgbWV0aG9kID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2Zvcm1tZXRob2QnKT8udG9VcHBlckNhc2UoKSA/PyBmb3JtPy5nZXRBdHRyaWJ1dGUoJ21ldGhvZCcpPy50b1VwcGVyQ2FzZSgpID8/ICdHRVQnO1xuICAgICAgICAgICAgdXJsID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2Zvcm1hY3Rpb24nKSA/PyBmb3JtPy5nZXRBdHRyaWJ1dGUoJ2FjdGlvbicpID8/IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2g7XG4gICAgICAgICAgICBkYXRhID0gbmV3IEZvcm1EYXRhKGZvcm0gPz8gdW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGlmIChlbGVtZW50LnR5cGUgPT09ICdzdWJtaXQnICYmIGVsZW1lbnQubmFtZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBkYXRhLmFwcGVuZChlbGVtZW50Lm5hbWUsIGVsZW1lbnQudmFsdWUgfHwgJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZWxlbWVudC50eXBlID09PSAnaW1hZ2UnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29vcmRzID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmVmaXggPSBlbGVtZW50Lm5hbWUgIT09ICcnID8gYCR7ZWxlbWVudC5uYW1lfS5gIDogJyc7XG4gICAgICAgICAgICAgICAgZGF0YS5hcHBlbmQoYCR7cHJlZml4fXhgLCBNYXRoLm1heCgwLCBNYXRoLmZsb29yKGV2ZW50ICE9PSB1bmRlZmluZWQgPyBldmVudC5wYWdlWCAtIGNvb3Jkcy5sZWZ0IDogMCkpKTtcbiAgICAgICAgICAgICAgICBkYXRhLmFwcGVuZChgJHtwcmVmaXh9eWAsIE1hdGgubWF4KDAsIE1hdGguZmxvb3IoZXZlbnQgIT09IHVuZGVmaW5lZCA/IGV2ZW50LnBhZ2VZIC0gY29vcmRzLnRvcCA6IDApKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0ludGVyYWN0aW9uKGVsZW1lbnQsIG1ldGhvZCwgdXJsLCBkYXRhLCBvcHRpb25zLCBldmVudCk7XG4gICAgfVxuICAgIGFzeW5jIHN1Ym1pdEZvcm0oZm9ybSwgb3B0aW9ucyA9IHt9LCBldmVudCkge1xuICAgICAgICBjb25zdCBtZXRob2QgPSBmb3JtLmdldEF0dHJpYnV0ZSgnbWV0aG9kJyk/LnRvVXBwZXJDYXNlKCkgPz8gJ0dFVCc7XG4gICAgICAgIGNvbnN0IHVybCA9IGZvcm0uZ2V0QXR0cmlidXRlKCdhY3Rpb24nKSA/PyB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyB3aW5kb3cubG9jYXRpb24uc2VhcmNoO1xuICAgICAgICBjb25zdCBkYXRhID0gbmV3IEZvcm1EYXRhKGZvcm0pO1xuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzSW50ZXJhY3Rpb24oZm9ybSwgbWV0aG9kLCB1cmwsIGRhdGEsIG9wdGlvbnMsIGV2ZW50KTtcbiAgICB9XG4gICAgYXN5bmMgcHJvY2Vzc0ludGVyYWN0aW9uKGVsZW1lbnQsIG1ldGhvZCwgdXJsLCBkYXRhID0gbnVsbCwgb3B0aW9ucyA9IHt9LCBldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2ludGVyYWN0aW9uJywgeyBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IHsgZWxlbWVudCwgb3JpZ2luYWxFdmVudDogZXZlbnQsIG9wdGlvbnMgfSB9KSkpIHtcbiAgICAgICAgICAgIGV2ZW50Py5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5pc1VybEFsbG93ZWQoYCR7dXJsfWApKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBkaXNwYXRjaCBhc3luYyByZXF1ZXN0LCBVUkwgaXMgbm90IGFsbG93ZWQ6ICR7dXJsfWApO1xuICAgICAgICB9XG4gICAgICAgIGV2ZW50Py5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5uYWphLm1ha2VSZXF1ZXN0KG1ldGhvZCwgdXJsLCBkYXRhLCBvcHRpb25zKTtcbiAgICB9XG4gICAgaXNVcmxBbGxvd2VkKHVybCkge1xuICAgICAgICBjb25zdCB1cmxPYmplY3QgPSBuZXcgVVJMKHVybCwgbG9jYXRpb24uaHJlZik7XG4gICAgICAgIC8vIGlnbm9yZSBub24tVVJMIFVSSXMgKGphdmFzY3JpcHQ6LCBkYXRhOiwgbWFpbHRvOiwgLi4uKVxuICAgICAgICBpZiAodXJsT2JqZWN0Lm9yaWdpbiA9PT0gJ251bGwnKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYWxsb3dlZE9yaWdpbnMuaW5jbHVkZXModXJsT2JqZWN0Lm9yaWdpbik7XG4gICAgfVxufVxuXG5jbGFzcyBGb3Jtc0hhbmRsZXIge1xuICAgIGNvbnN0cnVjdG9yKG5hamEpIHtcbiAgICAgICAgdGhpcy5uYWphID0gbmFqYTtcbiAgICAgICAgbmFqYS5hZGRFdmVudExpc3RlbmVyKCdpbml0JywgdGhpcy5pbml0aWFsaXplLmJpbmQodGhpcykpO1xuICAgICAgICBuYWphLnVpSGFuZGxlci5hZGRFdmVudExpc3RlbmVyKCdpbnRlcmFjdGlvbicsIHRoaXMucHJvY2Vzc0Zvcm0uYmluZCh0aGlzKSk7XG4gICAgfVxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIG9uRG9tUmVhZHkoKCkgPT4gdGhpcy5pbml0Rm9ybXMod2luZG93LmRvY3VtZW50LmJvZHkpKTtcbiAgICAgICAgdGhpcy5uYWphLnNuaXBwZXRIYW5kbGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2FmdGVyVXBkYXRlJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHNuaXBwZXQgfSA9IGV2ZW50LmRldGFpbDtcbiAgICAgICAgICAgIHRoaXMuaW5pdEZvcm1zKHNuaXBwZXQpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaW5pdEZvcm1zKGVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgbmV0dGVGb3JtcyA9IHRoaXMubmV0dGVGb3JtcyB8fCB3aW5kb3cuTmV0dGU7XG4gICAgICAgIGlmICghbmV0dGVGb3Jtcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbGVtZW50LnRhZ05hbWUgPT09ICdmb3JtJykge1xuICAgICAgICAgICAgbmV0dGVGb3Jtcy5pbml0Rm9ybShlbGVtZW50KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmb3JtcyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnZm9ybScpO1xuICAgICAgICBmb3Jtcy5mb3JFYWNoKChmb3JtKSA9PiBuZXR0ZUZvcm1zLmluaXRGb3JtKGZvcm0pKTtcbiAgICB9XG4gICAgcHJvY2Vzc0Zvcm0oZXZlbnQpIHtcbiAgICAgICAgY29uc3QgeyBlbGVtZW50LCBvcmlnaW5hbEV2ZW50IH0gPSBldmVudC5kZXRhaWw7XG4gICAgICAgIGNvbnN0IGlucHV0RWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgICAgIGlmIChpbnB1dEVsZW1lbnQuZm9ybSAhPT0gdW5kZWZpbmVkICYmIGlucHV0RWxlbWVudC5mb3JtICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpbnB1dEVsZW1lbnQuZm9ybVsnbmV0dGUtc3VibWl0dGVkQnknXSA9IGVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbmV0dGVGb3JtcyA9IHRoaXMubmV0dGVGb3JtcyB8fCB3aW5kb3cuTmV0dGU7XG4gICAgICAgIGlmICgoZWxlbWVudC50YWdOYW1lID09PSAnRk9STScgfHwgZWxlbWVudC5mb3JtKSAmJiBuZXR0ZUZvcm1zICYmICFuZXR0ZUZvcm1zLnZhbGlkYXRlRm9ybShlbGVtZW50KSkge1xuICAgICAgICAgICAgb3JpZ2luYWxFdmVudD8uc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBvcmlnaW5hbEV2ZW50Py5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgUmVkaXJlY3RIYW5kbGVyIGV4dGVuZHMgRXZlbnRUYXJnZXQge1xuICAgIGNvbnN0cnVjdG9yKG5hamEpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5uYWphID0gbmFqYTtcbiAgICAgICAgbmFqYS51aUhhbmRsZXIuYWRkRXZlbnRMaXN0ZW5lcignaW50ZXJhY3Rpb24nLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZWxlbWVudCwgb3B0aW9ucyB9ID0gZXZlbnQuZGV0YWlsO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQuaGFzQXR0cmlidXRlKCdkYXRhLW5hamEtZm9yY2UtcmVkaXJlY3QnKSB8fCBlbGVtZW50LmZvcm0/Lmhhc0F0dHJpYnV0ZSgnZGF0YS1uYWphLWZvcmNlLXJlZGlyZWN0JykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW5hamEtZm9yY2UtcmVkaXJlY3QnKSA/PyBlbGVtZW50LmZvcm0/LmdldEF0dHJpYnV0ZSgnZGF0YS1uYWphLWZvcmNlLXJlZGlyZWN0Jyk7XG4gICAgICAgICAgICAgICAgb3B0aW9ucy5mb3JjZVJlZGlyZWN0ID0gdmFsdWUgIT09ICdvZmYnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgbmFqYS5hZGRFdmVudExpc3RlbmVyKCdzdWNjZXNzJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHBheWxvYWQsIG9wdGlvbnMgfSA9IGV2ZW50LmRldGFpbDtcbiAgICAgICAgICAgIGlmICghcGF5bG9hZC5yZWRpcmVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubWFrZVJlZGlyZWN0KHBheWxvYWQucmVkaXJlY3QsIG9wdGlvbnMuZm9yY2VSZWRpcmVjdCA/PyBmYWxzZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBldmVudC5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubG9jYXRpb25BZGFwdGVyID0ge1xuICAgICAgICAgICAgYXNzaWduOiAodXJsKSA9PiB3aW5kb3cubG9jYXRpb24uYXNzaWduKHVybCksXG4gICAgICAgIH07XG4gICAgfVxuICAgIG1ha2VSZWRpcmVjdCh1cmwsIGZvcmNlLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgaWYgKHVybCBpbnN0YW5jZW9mIFVSTCkge1xuICAgICAgICAgICAgdXJsID0gdXJsLmhyZWY7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGlzSGFyZFJlZGlyZWN0ID0gZm9yY2UgfHwgIXRoaXMubmFqYS51aUhhbmRsZXIuaXNVcmxBbGxvd2VkKHVybCk7XG4gICAgICAgIGNvbnN0IGNhblJlZGlyZWN0ID0gdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgncmVkaXJlY3QnLCB7XG4gICAgICAgICAgICBjYW5jZWxhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgICAgIHNldFVybCh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICB1cmwgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGlzSGFyZFJlZGlyZWN0LFxuICAgICAgICAgICAgICAgIHNldEhhcmRSZWRpcmVjdCh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBpc0hhcmRSZWRpcmVjdCA9ICEhdmFsdWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSkpO1xuICAgICAgICBpZiAoIWNhblJlZGlyZWN0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzSGFyZFJlZGlyZWN0KSB7XG4gICAgICAgICAgICB0aGlzLmxvY2F0aW9uQWRhcHRlci5hc3NpZ24odXJsKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubmFqYS5tYWtlUmVxdWVzdCgnR0VUJywgdXJsLCBudWxsLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2xhc3MgU25pcHBldEhhbmRsZXIgZXh0ZW5kcyBFdmVudFRhcmdldCB7XG4gICAgY29uc3RydWN0b3IobmFqYSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLm9wID0ge1xuICAgICAgICAgICAgcmVwbGFjZToge1xuICAgICAgICAgICAgICAgIHVwZGF0ZUVsZW1lbnQoc25pcHBldCwgY29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICBzbmlwcGV0LmlubmVySFRNTCA9IGNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB1cGRhdGVJbmRleChfLCBuZXdDb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXdDb250ZW50O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcHJlcGVuZDoge1xuICAgICAgICAgICAgICAgIHVwZGF0ZUVsZW1lbnQoc25pcHBldCwgY29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICBzbmlwcGV0Lmluc2VydEFkamFjZW50SFRNTCgnYWZ0ZXJiZWdpbicsIGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdXBkYXRlSW5kZXgoY3VycmVudENvbnRlbnQsIG5ld0NvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ld0NvbnRlbnQgKyBjdXJyZW50Q29udGVudDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFwcGVuZDoge1xuICAgICAgICAgICAgICAgIHVwZGF0ZUVsZW1lbnQoc25pcHBldCwgY29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICBzbmlwcGV0Lmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgY29udGVudCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB1cGRhdGVJbmRleChjdXJyZW50Q29udGVudCwgbmV3Q29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudENvbnRlbnQgKyBuZXdDb250ZW50O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICBuYWphLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Y2Nlc3MnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgb3B0aW9ucywgcGF5bG9hZCB9ID0gZXZlbnQuZGV0YWlsO1xuICAgICAgICAgICAgaWYgKCFwYXlsb2FkLnNuaXBwZXRzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy51cGRhdGVTbmlwcGV0cyhwYXlsb2FkLnNuaXBwZXRzLCBmYWxzZSwgb3B0aW9ucyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzdGF0aWMgZmluZFNuaXBwZXRzKHByZWRpY2F0ZSwgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0ge307XG4gICAgICAgIGNvbnN0IHNuaXBwZXRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2lkXj1cInNuaXBwZXQtXCJdJyk7XG4gICAgICAgIHNuaXBwZXRzLmZvckVhY2goKHNuaXBwZXQpID0+IHtcbiAgICAgICAgICAgIGlmIChwcmVkaWNhdGU/LihzbmlwcGV0KSA/PyB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W3NuaXBwZXQuaWRdID0gc25pcHBldC5pbm5lckhUTUw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBhc3luYyB1cGRhdGVTbmlwcGV0cyhzbmlwcGV0cywgZnJvbUNhY2hlID0gZmFsc2UsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChPYmplY3Qua2V5cyhzbmlwcGV0cykubWFwKGFzeW5jIChpZCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc25pcHBldCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICAgICAgICAgIGlmIChzbmlwcGV0KSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVTbmlwcGV0KHNuaXBwZXQsIHNuaXBwZXRzW2lkXSwgZnJvbUNhY2hlLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH1cbiAgICBhc3luYyB1cGRhdGVTbmlwcGV0KHNuaXBwZXQsIGNvbnRlbnQsIGZyb21DYWNoZSwgb3B0aW9ucykge1xuICAgICAgICBsZXQgb3BlcmF0aW9uID0gdGhpcy5vcC5yZXBsYWNlO1xuICAgICAgICBpZiAoKHNuaXBwZXQuaGFzQXR0cmlidXRlKCdkYXRhLW5hamEtc25pcHBldC1wcmVwZW5kJykgfHwgc25pcHBldC5oYXNBdHRyaWJ1dGUoJ2RhdGEtYWpheC1wcmVwZW5kJykpICYmICFmcm9tQ2FjaGUpIHtcbiAgICAgICAgICAgIG9wZXJhdGlvbiA9IHRoaXMub3AucHJlcGVuZDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgoc25pcHBldC5oYXNBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1zbmlwcGV0LWFwcGVuZCcpIHx8IHNuaXBwZXQuaGFzQXR0cmlidXRlKCdkYXRhLWFqYXgtYXBwZW5kJykpICYmICFmcm9tQ2FjaGUpIHtcbiAgICAgICAgICAgIG9wZXJhdGlvbiA9IHRoaXMub3AuYXBwZW5kO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNhblVwZGF0ZSA9IHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2JlZm9yZVVwZGF0ZScsIHtcbiAgICAgICAgICAgIGNhbmNlbGFibGU6IHRydWUsXG4gICAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgICAgICBzbmlwcGV0LFxuICAgICAgICAgICAgICAgIGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgZnJvbUNhY2hlLFxuICAgICAgICAgICAgICAgIG9wZXJhdGlvbixcbiAgICAgICAgICAgICAgICBjaGFuZ2VPcGVyYXRpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSkpO1xuICAgICAgICBpZiAoIWNhblVwZGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3BlbmRpbmdVcGRhdGUnLCB7XG4gICAgICAgICAgICBkZXRhaWw6IHtcbiAgICAgICAgICAgICAgICBzbmlwcGV0LFxuICAgICAgICAgICAgICAgIGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgZnJvbUNhY2hlLFxuICAgICAgICAgICAgICAgIG9wZXJhdGlvbixcbiAgICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSkpO1xuICAgICAgICBjb25zdCB1cGRhdGVFbGVtZW50ID0gdHlwZW9mIG9wZXJhdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/IG9wZXJhdGlvbiA6IG9wZXJhdGlvbi51cGRhdGVFbGVtZW50O1xuICAgICAgICBhd2FpdCB1cGRhdGVFbGVtZW50KHNuaXBwZXQsIGNvbnRlbnQpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdhZnRlclVwZGF0ZScsIHtcbiAgICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgICAgIHNuaXBwZXQsXG4gICAgICAgICAgICAgICAgY29udGVudCxcbiAgICAgICAgICAgICAgICBmcm9tQ2FjaGUsXG4gICAgICAgICAgICAgICAgb3BlcmF0aW9uLFxuICAgICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KSk7XG4gICAgfVxufVxuXG5jbGFzcyBIaXN0b3J5SGFuZGxlciBleHRlbmRzIEV2ZW50VGFyZ2V0IHtcbiAgICBjb25zdHJ1Y3RvcihuYWphKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMubmFqYSA9IG5hamE7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jdXJzb3IgPSAwO1xuICAgICAgICB0aGlzLnBvcFN0YXRlSGFuZGxlciA9IHRoaXMuaGFuZGxlUG9wU3RhdGUuYmluZCh0aGlzKTtcbiAgICAgICAgbmFqYS5hZGRFdmVudExpc3RlbmVyKCdpbml0JywgdGhpcy5pbml0aWFsaXplLmJpbmQodGhpcykpO1xuICAgICAgICBuYWphLmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZScsIHRoaXMuc2F2ZVVybC5iaW5kKHRoaXMpKTtcbiAgICAgICAgbmFqYS5hZGRFdmVudExpc3RlbmVyKCdiZWZvcmUnLCB0aGlzLnJlcGxhY2VJbml0aWFsU3RhdGUuYmluZCh0aGlzKSk7XG4gICAgICAgIG5hamEuYWRkRXZlbnRMaXN0ZW5lcignc3VjY2VzcycsIHRoaXMucHVzaE5ld1N0YXRlLmJpbmQodGhpcykpO1xuICAgICAgICBuYWphLnJlZGlyZWN0SGFuZGxlci5hZGRFdmVudExpc3RlbmVyKCdyZWRpcmVjdCcsIHRoaXMuc2F2ZVJlZGlyZWN0ZWRVcmwuYmluZCh0aGlzKSk7XG4gICAgICAgIG5hamEudWlIYW5kbGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2ludGVyYWN0aW9uJywgdGhpcy5jb25maWd1cmVNb2RlLmJpbmQodGhpcykpO1xuICAgICAgICB0aGlzLmhpc3RvcnlBZGFwdGVyID0ge1xuICAgICAgICAgICAgcmVwbGFjZVN0YXRlOiAoc3RhdGUsIHVybCkgPT4gd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHN0YXRlLCAnJywgdXJsKSxcbiAgICAgICAgICAgIHB1c2hTdGF0ZTogKHN0YXRlLCB1cmwpID0+IHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShzdGF0ZSwgJycsIHVybCksXG4gICAgICAgIH07XG4gICAgfVxuICAgIHNldCB1aUNhY2hlKHZhbHVlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignTmFqYTogSGlzdG9yeUhhbmRsZXIudWlDYWNoZSBpcyBkZXByZWNhdGVkLCB1c2Ugb3B0aW9ucy5zbmlwcGV0Q2FjaGUgaW5zdGVhZC4nKTtcbiAgICAgICAgdGhpcy5uYWphLmRlZmF1bHRPcHRpb25zLnNuaXBwZXRDYWNoZSA9IHZhbHVlO1xuICAgIH1cbiAgICBoYW5kbGVQb3BTdGF0ZShldmVudCkge1xuICAgICAgICBjb25zdCB7IHN0YXRlIH0gPSBldmVudDtcbiAgICAgICAgaWYgKHN0YXRlPy5zb3VyY2UgIT09ICduYWphJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpcmVjdGlvbiA9IHN0YXRlLmN1cnNvciAtIHRoaXMuY3Vyc29yO1xuICAgICAgICB0aGlzLmN1cnNvciA9IHN0YXRlLmN1cnNvcjtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMubmFqYS5wcmVwYXJlT3B0aW9ucygpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZXN0b3JlU3RhdGUnLCB7IGRldGFpbDogeyBzdGF0ZSwgZGlyZWN0aW9uLCBvcHRpb25zIH0gfSkpO1xuICAgIH1cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCB0aGlzLnBvcFN0YXRlSGFuZGxlcik7XG4gICAgfVxuICAgIHNhdmVVcmwoZXZlbnQpIHtcbiAgICAgICAgY29uc3QgeyB1cmwsIG9wdGlvbnMgfSA9IGV2ZW50LmRldGFpbDtcbiAgICAgICAgb3B0aW9ucy5ocmVmID8/PSB1cmw7XG4gICAgfVxuICAgIHNhdmVSZWRpcmVjdGVkVXJsKGV2ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgdXJsLCBvcHRpb25zIH0gPSBldmVudC5kZXRhaWw7XG4gICAgICAgIG9wdGlvbnMuaHJlZiA9IHVybDtcbiAgICB9XG4gICAgcmVwbGFjZUluaXRpYWxTdGF0ZShldmVudCkge1xuICAgICAgICBjb25zdCB7IG9wdGlvbnMgfSA9IGV2ZW50LmRldGFpbDtcbiAgICAgICAgY29uc3QgbW9kZSA9IEhpc3RvcnlIYW5kbGVyLm5vcm1hbGl6ZU1vZGUob3B0aW9ucy5oaXN0b3J5KTtcbiAgICAgICAgaWYgKG1vZGUgIT09IGZhbHNlICYmICF0aGlzLmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICBvbkRvbVJlYWR5KCgpID0+IHRoaXMuaGlzdG9yeUFkYXB0ZXIucmVwbGFjZVN0YXRlKHRoaXMuYnVpbGRTdGF0ZSh3aW5kb3cubG9jYXRpb24uaHJlZiwgJ3JlcGxhY2UnLCB0aGlzLmN1cnNvciwgb3B0aW9ucyksIHdpbmRvdy5sb2NhdGlvbi5ocmVmKSk7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBjb25maWd1cmVNb2RlKGV2ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgZWxlbWVudCwgb3B0aW9ucyB9ID0gZXZlbnQuZGV0YWlsO1xuICAgICAgICBpZiAoZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1oaXN0b3J5JykgfHwgZWxlbWVudC5mb3JtPy5oYXNBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1oaXN0b3J5JykpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1oaXN0b3J5JykgPz8gZWxlbWVudC5mb3JtPy5nZXRBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1oaXN0b3J5Jyk7XG4gICAgICAgICAgICBvcHRpb25zLmhpc3RvcnkgPSBIaXN0b3J5SGFuZGxlci5ub3JtYWxpemVNb2RlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzdGF0aWMgbm9ybWFsaXplTW9kZShtb2RlKSB7XG4gICAgICAgIGlmIChtb2RlID09PSAnb2ZmJyB8fCBtb2RlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG1vZGUgPT09ICdyZXBsYWNlJykge1xuICAgICAgICAgICAgcmV0dXJuICdyZXBsYWNlJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcHVzaE5ld1N0YXRlKGV2ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgcGF5bG9hZCwgb3B0aW9ucyB9ID0gZXZlbnQuZGV0YWlsO1xuICAgICAgICBjb25zdCBtb2RlID0gSGlzdG9yeUhhbmRsZXIubm9ybWFsaXplTW9kZShvcHRpb25zLmhpc3RvcnkpO1xuICAgICAgICBpZiAobW9kZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGF5bG9hZC5wb3N0R2V0ICYmIHBheWxvYWQudXJsKSB7XG4gICAgICAgICAgICBvcHRpb25zLmhyZWYgPSBwYXlsb2FkLnVybDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtZXRob2QgPSBtb2RlID09PSAncmVwbGFjZScgPyAncmVwbGFjZVN0YXRlJyA6ICdwdXNoU3RhdGUnO1xuICAgICAgICBjb25zdCBjdXJzb3IgPSBtb2RlID09PSAncmVwbGFjZScgPyB0aGlzLmN1cnNvciA6ICsrdGhpcy5jdXJzb3I7XG4gICAgICAgIHRoaXMuaGlzdG9yeUFkYXB0ZXJbbWV0aG9kXSh0aGlzLmJ1aWxkU3RhdGUob3B0aW9ucy5ocmVmLCBtb2RlLCBjdXJzb3IsIG9wdGlvbnMpLCBvcHRpb25zLmhyZWYpO1xuICAgIH1cbiAgICBidWlsZFN0YXRlKGhyZWYsIG1vZGUsIGN1cnNvciwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IHtcbiAgICAgICAgICAgIHNvdXJjZTogJ25hamEnLFxuICAgICAgICAgICAgY3Vyc29yLFxuICAgICAgICAgICAgaHJlZixcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnYnVpbGRTdGF0ZScsIHtcbiAgICAgICAgICAgIGRldGFpbDoge1xuICAgICAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgICAgIG9wZXJhdGlvbjogbW9kZSA9PT0gJ3JlcGxhY2UnID8gJ3JlcGxhY2VTdGF0ZScgOiAncHVzaFN0YXRlJyxcbiAgICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSkpO1xuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfVxufVxuXG5jbGFzcyBTbmlwcGV0Q2FjaGUgZXh0ZW5kcyBFdmVudFRhcmdldCB7XG4gICAgY29uc3RydWN0b3IobmFqYSkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLm5hamEgPSBuYWphO1xuICAgICAgICB0aGlzLmN1cnJlbnRTbmlwcGV0cyA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy5zdG9yYWdlcyA9IHtcbiAgICAgICAgICAgIG9mZjogbmV3IE9mZkNhY2hlU3RvcmFnZShuYWphKSxcbiAgICAgICAgICAgIGhpc3Rvcnk6IG5ldyBIaXN0b3J5Q2FjaGVTdG9yYWdlKCksXG4gICAgICAgICAgICBzZXNzaW9uOiBuZXcgU2Vzc2lvbkNhY2hlU3RvcmFnZSgpLFxuICAgICAgICB9O1xuICAgICAgICBuYWphLmFkZEV2ZW50TGlzdGVuZXIoJ2luaXQnLCB0aGlzLmluaXRpYWxpemVJbmRleC5iaW5kKHRoaXMpKTtcbiAgICAgICAgbmFqYS5zbmlwcGV0SGFuZGxlci5hZGRFdmVudExpc3RlbmVyKCdwZW5kaW5nVXBkYXRlJywgdGhpcy51cGRhdGVJbmRleC5iaW5kKHRoaXMpKTtcbiAgICAgICAgbmFqYS51aUhhbmRsZXIuYWRkRXZlbnRMaXN0ZW5lcignaW50ZXJhY3Rpb24nLCB0aGlzLmNvbmZpZ3VyZUNhY2hlLmJpbmQodGhpcykpO1xuICAgICAgICBuYWphLmhpc3RvcnlIYW5kbGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2J1aWxkU3RhdGUnLCB0aGlzLmJ1aWxkSGlzdG9yeVN0YXRlLmJpbmQodGhpcykpO1xuICAgICAgICBuYWphLmhpc3RvcnlIYW5kbGVyLmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc3RvcmVTdGF0ZScsIHRoaXMucmVzdG9yZUhpc3RvcnlTdGF0ZS5iaW5kKHRoaXMpKTtcbiAgICB9XG4gICAgcmVzb2x2ZVN0b3JhZ2Uob3B0aW9uKSB7XG4gICAgICAgIGxldCBzdG9yYWdlVHlwZTtcbiAgICAgICAgaWYgKG9wdGlvbiA9PT0gdHJ1ZSB8fCBvcHRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RvcmFnZVR5cGUgPSAnaGlzdG9yeSc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAob3B0aW9uID09PSBmYWxzZSkge1xuICAgICAgICAgICAgc3RvcmFnZVR5cGUgPSAnb2ZmJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN0b3JhZ2VUeXBlID0gb3B0aW9uO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnN0b3JhZ2VzW3N0b3JhZ2VUeXBlXTtcbiAgICB9XG4gICAgc3RhdGljIHNob3VsZENhY2hlU25pcHBldChzbmlwcGV0KSB7XG4gICAgICAgIHJldHVybiAhc25pcHBldC5oYXNBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1oaXN0b3J5LW5vY2FjaGUnKVxuICAgICAgICAgICAgJiYgIXNuaXBwZXQuaGFzQXR0cmlidXRlKCdkYXRhLWhpc3Rvcnktbm9jYWNoZScpXG4gICAgICAgICAgICAmJiAoIXNuaXBwZXQuaGFzQXR0cmlidXRlKCdkYXRhLW5hamEtc25pcHBldC1jYWNoZScpXG4gICAgICAgICAgICAgICAgfHwgc25pcHBldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1zbmlwcGV0LWNhY2hlJykgIT09ICdvZmYnKTtcbiAgICB9XG4gICAgaW5pdGlhbGl6ZUluZGV4KCkge1xuICAgICAgICBvbkRvbVJlYWR5KCgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTbmlwcGV0cyA9IFNuaXBwZXRIYW5kbGVyLmZpbmRTbmlwcGV0cyhTbmlwcGV0Q2FjaGUuc2hvdWxkQ2FjaGVTbmlwcGV0KTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFNuaXBwZXRzID0gbmV3IE1hcChPYmplY3QuZW50cmllcyhjdXJyZW50U25pcHBldHMpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHVwZGF0ZUluZGV4KGV2ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgc25pcHBldCwgY29udGVudCwgb3BlcmF0aW9uIH0gPSBldmVudC5kZXRhaWw7XG4gICAgICAgIGlmICghU25pcHBldENhY2hlLnNob3VsZENhY2hlU25pcHBldChzbmlwcGV0KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGN1cnJlbnRDb250ZW50ID0gdGhpcy5jdXJyZW50U25pcHBldHMuZ2V0KHNuaXBwZXQuaWQpID8/ICcnO1xuICAgICAgICBjb25zdCB1cGRhdGVJbmRleCA9IHR5cGVvZiBvcGVyYXRpb24gPT09ICdvYmplY3QnXG4gICAgICAgICAgICA/IG9wZXJhdGlvbi51cGRhdGVJbmRleFxuICAgICAgICAgICAgOiAoKSA9PiBjb250ZW50O1xuICAgICAgICB0aGlzLmN1cnJlbnRTbmlwcGV0cy5zZXQoc25pcHBldC5pZCwgdXBkYXRlSW5kZXgoY3VycmVudENvbnRlbnQsIGNvbnRlbnQpKTtcbiAgICAgICAgLy8gdXBkYXRlIG5lc3RlZCBzbmlwcGV0c1xuICAgICAgICBjb25zdCBzbmlwcGV0Q29udGVudCA9IFNuaXBwZXRDYWNoZS5wYXJzZXIucGFyc2VGcm9tU3RyaW5nKGNvbnRlbnQsICd0ZXh0L2h0bWwnKTtcbiAgICAgICAgY29uc3QgbmVzdGVkU25pcHBldHMgPSBTbmlwcGV0SGFuZGxlci5maW5kU25pcHBldHMoU25pcHBldENhY2hlLnNob3VsZENhY2hlU25pcHBldCwgc25pcHBldENvbnRlbnQpO1xuICAgICAgICBmb3IgKGNvbnN0IFtpZCwgY29udGVudF0gb2YgT2JqZWN0LmVudHJpZXMobmVzdGVkU25pcHBldHMpKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTbmlwcGV0cy5zZXQoaWQsIGNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNvbmZpZ3VyZUNhY2hlKGV2ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgZWxlbWVudCwgb3B0aW9ucyB9ID0gZXZlbnQuZGV0YWlsO1xuICAgICAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1zbmlwcGV0LWNhY2hlJykgfHwgZWxlbWVudC5mb3JtPy5oYXNBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1zbmlwcGV0LWNhY2hlJylcbiAgICAgICAgICAgIHx8IGVsZW1lbnQuaGFzQXR0cmlidXRlKCdkYXRhLW5hamEtaGlzdG9yeS1jYWNoZScpIHx8IGVsZW1lbnQuZm9ybT8uaGFzQXR0cmlidXRlKCdkYXRhLW5hamEtaGlzdG9yeS1jYWNoZScpKSB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLW5hamEtc25pcHBldC1jYWNoZScpXG4gICAgICAgICAgICAgICAgPz8gZWxlbWVudC5mb3JtPy5nZXRBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1zbmlwcGV0LWNhY2hlJylcbiAgICAgICAgICAgICAgICA/PyBlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1uYWphLWhpc3RvcnktY2FjaGUnKVxuICAgICAgICAgICAgICAgID8/IGVsZW1lbnQuZm9ybT8uZ2V0QXR0cmlidXRlKCdkYXRhLW5hamEtaGlzdG9yeS1jYWNoZScpO1xuICAgICAgICAgICAgb3B0aW9ucy5zbmlwcGV0Q2FjaGUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBidWlsZEhpc3RvcnlTdGF0ZShldmVudCkge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBvcHRpb25zIH0gPSBldmVudC5kZXRhaWw7XG4gICAgICAgIGlmICgnaGlzdG9yeVVpQ2FjaGUnIGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignTmFqYTogb3B0aW9ucy5oaXN0b3J5VWlDYWNoZSBpcyBkZXByZWNhdGVkLCB1c2Ugb3B0aW9ucy5zbmlwcGV0Q2FjaGUgaW5zdGVhZC4nKTtcbiAgICAgICAgICAgIG9wdGlvbnMuc25pcHBldENhY2hlID0gb3B0aW9ucy5oaXN0b3J5VWlDYWNoZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwcmVzZW50U25pcHBldElkcyA9IE9iamVjdC5rZXlzKFNuaXBwZXRIYW5kbGVyLmZpbmRTbmlwcGV0cyhTbmlwcGV0Q2FjaGUuc2hvdWxkQ2FjaGVTbmlwcGV0KSk7XG4gICAgICAgIGNvbnN0IHNuaXBwZXRzID0gT2JqZWN0LmZyb21FbnRyaWVzKEFycmF5LmZyb20odGhpcy5jdXJyZW50U25pcHBldHMpLmZpbHRlcigoW2lkXSkgPT4gcHJlc2VudFNuaXBwZXRJZHMuaW5jbHVkZXMoaWQpKSk7XG4gICAgICAgIGlmICghdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnc3RvcmUnLCB7IGNhbmNlbGFibGU6IHRydWUsIGRldGFpbDogeyBzbmlwcGV0cywgc3RhdGUsIG9wdGlvbnMgfSB9KSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzdG9yYWdlID0gdGhpcy5yZXNvbHZlU3RvcmFnZShvcHRpb25zLnNuaXBwZXRDYWNoZSk7XG4gICAgICAgIHN0YXRlLnNuaXBwZXRzID0ge1xuICAgICAgICAgICAgc3RvcmFnZTogc3RvcmFnZS50eXBlLFxuICAgICAgICAgICAga2V5OiBzdG9yYWdlLnN0b3JlKHNuaXBwZXRzKSxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmVzdG9yZUhpc3RvcnlTdGF0ZShldmVudCkge1xuICAgICAgICBjb25zdCB7IHN0YXRlLCBvcHRpb25zIH0gPSBldmVudC5kZXRhaWw7XG4gICAgICAgIGlmIChzdGF0ZS5zbmlwcGV0cyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgb3B0aW9ucy5zbmlwcGV0Q2FjaGUgPSBzdGF0ZS5zbmlwcGV0cy5zdG9yYWdlO1xuICAgICAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2ZldGNoJywgeyBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IHsgc3RhdGUsIG9wdGlvbnMgfSB9KSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzdG9yYWdlID0gdGhpcy5yZXNvbHZlU3RvcmFnZShvcHRpb25zLnNuaXBwZXRDYWNoZSk7XG4gICAgICAgIGNvbnN0IHNuaXBwZXRzID0gc3RvcmFnZS5mZXRjaChzdGF0ZS5zbmlwcGV0cy5rZXksIHN0YXRlLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKHNuaXBwZXRzID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdyZXN0b3JlJywgeyBjYW5jZWxhYmxlOiB0cnVlLCBkZXRhaWw6IHsgc25pcHBldHMsIHN0YXRlLCBvcHRpb25zIH0gfSkpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5uYWphLnNuaXBwZXRIYW5kbGVyLnVwZGF0ZVNuaXBwZXRzKHNuaXBwZXRzLCB0cnVlLCBvcHRpb25zKTtcbiAgICB9XG59XG5TbmlwcGV0Q2FjaGUucGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xuY2xhc3MgT2ZmQ2FjaGVTdG9yYWdlIHtcbiAgICBjb25zdHJ1Y3RvcihuYWphKSB7XG4gICAgICAgIHRoaXMubmFqYSA9IG5hamE7XG4gICAgICAgIHRoaXMudHlwZSA9ICdvZmYnO1xuICAgIH0gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1lbXB0eS1mdW5jdGlvblxuICAgIHN0b3JlKCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgZmV0Y2goa2V5LCBzdGF0ZSwgb3B0aW9ucykge1xuICAgICAgICB0aGlzLm5hamEubWFrZVJlcXVlc3QoJ0dFVCcsIHN0YXRlLmhyZWYsIG51bGwsIHtcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBoaXN0b3J5OiBmYWxzZSxcbiAgICAgICAgICAgIHNuaXBwZXRDYWNoZTogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5jbGFzcyBIaXN0b3J5Q2FjaGVTdG9yYWdlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ2hpc3RvcnknO1xuICAgIH1cbiAgICBzdG9yZShkYXRhKSB7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbiAgICBmZXRjaChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGtleTtcbiAgICB9XG59XG5jbGFzcyBTZXNzaW9uQ2FjaGVTdG9yYWdlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy50eXBlID0gJ3Nlc3Npb24nO1xuICAgIH1cbiAgICBzdG9yZShkYXRhKSB7XG4gICAgICAgIGNvbnN0IGtleSA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyLCA4KTtcbiAgICAgICAgd2luZG93LnNlc3Npb25TdG9yYWdlLnNldEl0ZW0oa2V5LCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XG4gICAgICAgIHJldHVybiBrZXk7XG4gICAgfVxuICAgIGZldGNoKGtleSkge1xuICAgICAgICBjb25zdCBkYXRhID0gd2luZG93LnNlc3Npb25TdG9yYWdlLmdldEl0ZW0oa2V5KTtcbiAgICAgICAgaWYgKGRhdGEgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGRhdGEpO1xuICAgIH1cbn1cblxuY2xhc3MgU2NyaXB0TG9hZGVyIHtcbiAgICBjb25zdHJ1Y3RvcihuYWphKSB7XG4gICAgICAgIHRoaXMubmFqYSA9IG5hamE7XG4gICAgICAgIHRoaXMubG9hZGVkU2NyaXB0cyA9IG5ldyBTZXQoKTtcbiAgICAgICAgbmFqYS5hZGRFdmVudExpc3RlbmVyKCdpbml0JywgdGhpcy5pbml0aWFsaXplLmJpbmQodGhpcykpO1xuICAgIH1cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBvbkRvbVJlYWR5KCgpID0+IHtcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdFtkYXRhLW5hamEtc2NyaXB0LWlkXScpLmZvckVhY2goKHNjcmlwdCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmlwdElkID0gc2NyaXB0LmdldEF0dHJpYnV0ZSgnZGF0YS1uYWphLXNjcmlwdC1pZCcpO1xuICAgICAgICAgICAgICAgIGlmIChzY3JpcHRJZCAhPT0gbnVsbCAmJiBzY3JpcHRJZCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkZWRTY3JpcHRzLmFkZChzY3JpcHRJZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLm5hamEuc25pcHBldEhhbmRsZXIuYWRkRXZlbnRMaXN0ZW5lcignYWZ0ZXJVcGRhdGUnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgY29udGVudCB9ID0gZXZlbnQuZGV0YWlsO1xuICAgICAgICAgICAgdGhpcy5sb2FkU2NyaXB0cyhjb250ZW50KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGxvYWRTY3JpcHRzKHNuaXBwZXRzT3JTbmlwcGV0KSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc25pcHBldHNPclNuaXBwZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRTY3JpcHRzSW5TbmlwcGV0KHNuaXBwZXRzT3JTbmlwcGV0KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBPYmplY3Qua2V5cyhzbmlwcGV0c09yU25pcHBldCkuZm9yRWFjaCgoaWQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBzbmlwcGV0c09yU25pcHBldFtpZF07XG4gICAgICAgICAgICB0aGlzLmxvYWRTY3JpcHRzSW5TbmlwcGV0KGNvbnRlbnQpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbG9hZFNjcmlwdHNJblNuaXBwZXQoY29udGVudCkge1xuICAgICAgICBpZiAoIS88c2NyaXB0L2kudGVzdChjb250ZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNuaXBwZXRDb250ZW50ID0gU2NyaXB0TG9hZGVyLnBhcnNlci5wYXJzZUZyb21TdHJpbmcoY29udGVudCwgJ3RleHQvaHRtbCcpO1xuICAgICAgICBjb25zdCBzY3JpcHRzID0gc25pcHBldENvbnRlbnQucXVlcnlTZWxlY3RvckFsbCgnc2NyaXB0Jyk7XG4gICAgICAgIHNjcmlwdHMuZm9yRWFjaCgoc2NyaXB0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzY3JpcHRJZCA9IHNjcmlwdC5nZXRBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1zY3JpcHQtaWQnKTtcbiAgICAgICAgICAgIGlmIChzY3JpcHRJZCAhPT0gbnVsbCAmJiBzY3JpcHRJZCAhPT0gJycgJiYgdGhpcy5sb2FkZWRTY3JpcHRzLmhhcyhzY3JpcHRJZCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBzY3JpcHRFbCA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgICAgICAgIHNjcmlwdEVsLmlubmVySFRNTCA9IHNjcmlwdC5pbm5lckhUTUw7XG4gICAgICAgICAgICBpZiAoc2NyaXB0Lmhhc0F0dHJpYnV0ZXMoKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYXR0cmlidXRlIG9mIHNjcmlwdC5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdEVsLnNldEF0dHJpYnV0ZShhdHRyaWJ1dGUubmFtZSwgYXR0cmlidXRlLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aW5kb3cuZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHRFbClcbiAgICAgICAgICAgICAgICAucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzY3JpcHRFbCk7XG4gICAgICAgICAgICBpZiAoc2NyaXB0SWQgIT09IG51bGwgJiYgc2NyaXB0SWQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkZWRTY3JpcHRzLmFkZChzY3JpcHRJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblNjcmlwdExvYWRlci5wYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XG5cbmNsYXNzIE5hamEgZXh0ZW5kcyBFdmVudFRhcmdldCB7XG4gICAgY29uc3RydWN0b3IodWlIYW5kbGVyLCByZWRpcmVjdEhhbmRsZXIsIHNuaXBwZXRIYW5kbGVyLCBmb3Jtc0hhbmRsZXIsIGhpc3RvcnlIYW5kbGVyLCBzbmlwcGV0Q2FjaGUsIHNjcmlwdExvYWRlcikge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLlZFUlNJT04gPSAzO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZXh0ZW5zaW9ucyA9IFtdO1xuICAgICAgICB0aGlzLmRlZmF1bHRPcHRpb25zID0ge307XG4gICAgICAgIHRoaXMudWlIYW5kbGVyID0gbmV3ICh1aUhhbmRsZXIgPz8gVUlIYW5kbGVyKSh0aGlzKTtcbiAgICAgICAgdGhpcy5yZWRpcmVjdEhhbmRsZXIgPSBuZXcgKHJlZGlyZWN0SGFuZGxlciA/PyBSZWRpcmVjdEhhbmRsZXIpKHRoaXMpO1xuICAgICAgICB0aGlzLnNuaXBwZXRIYW5kbGVyID0gbmV3IChzbmlwcGV0SGFuZGxlciA/PyBTbmlwcGV0SGFuZGxlcikodGhpcyk7XG4gICAgICAgIHRoaXMuZm9ybXNIYW5kbGVyID0gbmV3IChmb3Jtc0hhbmRsZXIgPz8gRm9ybXNIYW5kbGVyKSh0aGlzKTtcbiAgICAgICAgdGhpcy5oaXN0b3J5SGFuZGxlciA9IG5ldyAoaGlzdG9yeUhhbmRsZXIgPz8gSGlzdG9yeUhhbmRsZXIpKHRoaXMpO1xuICAgICAgICB0aGlzLnNuaXBwZXRDYWNoZSA9IG5ldyAoc25pcHBldENhY2hlID8/IFNuaXBwZXRDYWNoZSkodGhpcyk7XG4gICAgICAgIHRoaXMuc2NyaXB0TG9hZGVyID0gbmV3IChzY3JpcHRMb2FkZXIgPz8gU2NyaXB0TG9hZGVyKSh0aGlzKTtcbiAgICB9XG4gICAgcmVnaXN0ZXJFeHRlbnNpb24oZXh0ZW5zaW9uKSB7XG4gICAgICAgIGlmICh0aGlzLmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICBleHRlbnNpb24uaW5pdGlhbGl6ZSh0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmV4dGVuc2lvbnMucHVzaChleHRlbnNpb24pO1xuICAgIH1cbiAgICBpbml0aWFsaXplKGRlZmF1bHRPcHRpb25zID0ge30pIHtcbiAgICAgICAgaWYgKHRoaXMuaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGluaXRpYWxpemUgTmFqYSwgaXQgaXMgYWxyZWFkeSBpbml0aWFsaXplZC4nKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRlZmF1bHRPcHRpb25zID0gdGhpcy5wcmVwYXJlT3B0aW9ucyhkZWZhdWx0T3B0aW9ucyk7XG4gICAgICAgIHRoaXMuZXh0ZW5zaW9ucy5mb3JFYWNoKChleHRlbnNpb24pID0+IGV4dGVuc2lvbi5pbml0aWFsaXplKHRoaXMpKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnaW5pdCcsIHsgZGV0YWlsOiB7IGRlZmF1bHRPcHRpb25zOiB0aGlzLmRlZmF1bHRPcHRpb25zIH0gfSkpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcHJlcGFyZU9wdGlvbnMob3B0aW9ucykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLi4udGhpcy5kZWZhdWx0T3B0aW9ucyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICBmZXRjaDoge1xuICAgICAgICAgICAgICAgIC4uLnRoaXMuZGVmYXVsdE9wdGlvbnMuZmV0Y2gsXG4gICAgICAgICAgICAgICAgLi4ub3B0aW9ucz8uZmV0Y2gsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cbiAgICBhc3luYyBtYWtlUmVxdWVzdChtZXRob2QsIHVybCwgZGF0YSA9IG51bGwsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICAvLyBub3JtYWxpemUgdXJsIHRvIGluc3RhbmNlb2YgVVJMXG4gICAgICAgIGlmICh0eXBlb2YgdXJsID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdXJsID0gbmV3IFVSTCh1cmwsIGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMgPSB0aGlzLnByZXBhcmVPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5mZXRjaC5oZWFkZXJzIHx8IHt9KTtcbiAgICAgICAgY29uc3QgYm9keSA9IHRoaXMudHJhbnNmb3JtRGF0YSh1cmwsIG1ldGhvZCwgZGF0YSk7XG4gICAgICAgIGNvbnN0IGFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHVybC50b1N0cmluZygpLCB7XG4gICAgICAgICAgICBjcmVkZW50aWFsczogJ3NhbWUtb3JpZ2luJyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMuZmV0Y2gsXG4gICAgICAgICAgICBtZXRob2QsXG4gICAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgICAgYm9keSxcbiAgICAgICAgICAgIHNpZ25hbDogYWJvcnRDb250cm9sbGVyLnNpZ25hbCxcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGltcGVyc29uYXRlIFhIUiBzbyB0aGF0IE5ldHRlIGNhbiBkZXRlY3QgaXNBamF4KClcbiAgICAgICAgcmVxdWVzdC5oZWFkZXJzLnNldCgnWC1SZXF1ZXN0ZWQtV2l0aCcsICdYTUxIdHRwUmVxdWVzdCcpO1xuICAgICAgICAvLyBoaW50IHRoZSBzZXJ2ZXIgdGhhdCBOYWphIGV4cGVjdHMgcmVzcG9uc2UgdG8gYmUgSlNPTlxuICAgICAgICByZXF1ZXN0LmhlYWRlcnMuc2V0KCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICBpZiAoIXRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2JlZm9yZScsIHsgY2FuY2VsYWJsZTogdHJ1ZSwgZGV0YWlsOiB7IHJlcXVlc3QsIG1ldGhvZCwgdXJsOiB1cmwudG9TdHJpbmcoKSwgZGF0YSwgb3B0aW9ucyB9IH0pKSkge1xuICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHByb21pc2UgPSB3aW5kb3cuZmV0Y2gocmVxdWVzdCk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3N0YXJ0JywgeyBkZXRhaWw6IHsgcmVxdWVzdCwgcHJvbWlzZSwgYWJvcnRDb250cm9sbGVyLCBvcHRpb25zIH0gfSkpO1xuICAgICAgICBsZXQgcmVzcG9uc2UsIHBheWxvYWQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEh0dHBFcnJvcihyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXlsb2FkID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdBYm9ydEVycm9yJykge1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2Fib3J0JywgeyBkZXRhaWw6IHsgcmVxdWVzdCwgZXJyb3IsIG9wdGlvbnMgfSB9KSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY29tcGxldGUnLCB7IGRldGFpbDogeyByZXF1ZXN0LCByZXNwb25zZSwgcGF5bG9hZDogdW5kZWZpbmVkLCBlcnJvciwgb3B0aW9ucyB9IH0pKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdlcnJvcicsIHsgZGV0YWlsOiB7IHJlcXVlc3QsIHJlc3BvbnNlLCBlcnJvciwgb3B0aW9ucyB9IH0pKTtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2NvbXBsZXRlJywgeyBkZXRhaWw6IHsgcmVxdWVzdCwgcmVzcG9uc2UsIHBheWxvYWQ6IHVuZGVmaW5lZCwgZXJyb3IsIG9wdGlvbnMgfSB9KSk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdwYXlsb2FkJywgeyBkZXRhaWw6IHsgcmVxdWVzdCwgcmVzcG9uc2UsIHBheWxvYWQsIG9wdGlvbnMgfSB9KSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ3N1Y2Nlc3MnLCB7IGRldGFpbDogeyByZXF1ZXN0LCByZXNwb25zZSwgcGF5bG9hZCwgb3B0aW9ucyB9IH0pKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY29tcGxldGUnLCB7IGRldGFpbDogeyByZXF1ZXN0LCByZXNwb25zZSwgcGF5bG9hZCwgZXJyb3I6IHVuZGVmaW5lZCwgb3B0aW9ucyB9IH0pKTtcbiAgICAgICAgcmV0dXJuIHBheWxvYWQ7XG4gICAgfVxuICAgIGFwcGVuZFRvUXVlcnlTdHJpbmcoc2VhcmNoUGFyYW1zLCBrZXksIHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSkgPT09IE9iamVjdC5wcm90b3R5cGUpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3N1YmtleSwgc3VidmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kVG9RdWVyeVN0cmluZyhzZWFyY2hQYXJhbXMsIGAke2tleX1bJHtzdWJrZXl9XWAsIHN1YnZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNlYXJjaFBhcmFtcy5hcHBlbmQoa2V5LCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0cmFuc2Zvcm1EYXRhKHVybCwgbWV0aG9kLCBkYXRhKSB7XG4gICAgICAgIGNvbnN0IGlzR2V0ID0gWydHRVQnLCAnSEVBRCddLmluY2x1ZGVzKG1ldGhvZC50b1VwcGVyQ2FzZSgpKTtcbiAgICAgICAgLy8gc2VuZGluZyBhIGZvcm0gdmlhIEdFVCAtPiBzZXJpYWxpemUgRm9ybURhdGEgaW50byBVUkwgYW5kIHJldHVybiBlbXB0eSByZXF1ZXN0IGJvZHlcbiAgICAgICAgaWYgKGlzR2V0ICYmIGRhdGEgaW5zdGFuY2VvZiBGb3JtRGF0YSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgZGF0YSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHVybC5zZWFyY2hQYXJhbXMuYXBwZW5kKGtleSwgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2VuZGluZyBhIFBPSk8gLT4gc2VyaWFsaXplIGl0IHJlY3Vyc2l2ZWx5IGludG8gVVJMU2VhcmNoUGFyYW1zXG4gICAgICAgIGNvbnN0IGlzRGF0YVBvam8gPSBkYXRhICE9PSBudWxsICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihkYXRhKSA9PT0gT2JqZWN0LnByb3RvdHlwZTtcbiAgICAgICAgaWYgKGlzRGF0YVBvam8gfHwgQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgLy8gZm9yIEdFVCByZXF1ZXN0cywgYXBwZW5kIHZhbHVlcyB0byBVUkwgYW5kIHJldHVybiBlbXB0eSByZXF1ZXN0IGJvZHlcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBidWlsZCBgbmV3IFVSTFNlYXJjaFBhcmFtcygpYCB0byBhY3QgYXMgdGhlIHJlcXVlc3QgYm9keVxuICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZWREYXRhID0gaXNHZXQgPyB1cmwuc2VhcmNoUGFyYW1zIDogbmV3IFVSTFNlYXJjaFBhcmFtcygpO1xuICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZFRvUXVlcnlTdHJpbmcodHJhbnNmb3JtZWREYXRhLCBrZXksIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpc0dldFxuICAgICAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgICAgIDogdHJhbnNmb3JtZWREYXRhO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbn1cbmNsYXNzIEh0dHBFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgICBjb25zdHJ1Y3RvcihyZXNwb25zZSkge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YDtcbiAgICAgICAgc3VwZXIobWVzc2FnZSk7XG4gICAgICAgIHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgdGhpcy5zdGFjayA9IG5ldyBFcnJvcihtZXNzYWdlKS5zdGFjaztcbiAgICAgICAgdGhpcy5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICAgIH1cbn1cblxuY2xhc3MgQWJvcnRFeHRlbnNpb24ge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLmFib3J0Q29udHJvbGxlcnMgPSBuZXcgU2V0KCk7XG4gICAgfVxuICAgIGluaXRpYWxpemUobmFqYSkge1xuICAgICAgICBuYWphLnVpSGFuZGxlci5hZGRFdmVudExpc3RlbmVyKCdpbnRlcmFjdGlvbicsIHRoaXMuY2hlY2tBYm9ydGFibGUuYmluZCh0aGlzKSk7XG4gICAgICAgIG5hamEuYWRkRXZlbnRMaXN0ZW5lcignaW5pdCcsIHRoaXMub25Jbml0aWFsaXplLmJpbmQodGhpcykpO1xuICAgICAgICBuYWphLmFkZEV2ZW50TGlzdGVuZXIoJ3N0YXJ0JywgdGhpcy5zYXZlQWJvcnRDb250cm9sbGVyLmJpbmQodGhpcykpO1xuICAgICAgICBuYWphLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbXBsZXRlJywgdGhpcy5yZW1vdmVBYm9ydENvbnRyb2xsZXIuYmluZCh0aGlzKSk7XG4gICAgfVxuICAgIG9uSW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VzY2FwZScgJiYgIShldmVudC5jdHJsS2V5IHx8IGV2ZW50LnNoaWZ0S2V5IHx8IGV2ZW50LmFsdEtleSB8fCBldmVudC5tZXRhS2V5KSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29udHJvbGxlciBvZiB0aGlzLmFib3J0Q29udHJvbGxlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlci5hYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmFib3J0Q29udHJvbGxlcnMuY2xlYXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGNoZWNrQWJvcnRhYmxlKGV2ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgZWxlbWVudCwgb3B0aW9ucyB9ID0gZXZlbnQuZGV0YWlsO1xuICAgICAgICBpZiAoZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1hYm9ydCcpIHx8IGVsZW1lbnQuZm9ybT8uaGFzQXR0cmlidXRlKCdkYXRhLW5hamEtYWJvcnQnKSkge1xuICAgICAgICAgICAgb3B0aW9ucy5hYm9ydCA9IChlbGVtZW50LmdldEF0dHJpYnV0ZSgnZGF0YS1uYWphLWFib3J0JykgPz8gZWxlbWVudC5mb3JtPy5nZXRBdHRyaWJ1dGUoJ2RhdGEtbmFqYS1hYm9ydCcpKSAhPT0gJ29mZic7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc2F2ZUFib3J0Q29udHJvbGxlcihldmVudCkge1xuICAgICAgICBjb25zdCB7IGFib3J0Q29udHJvbGxlciwgb3B0aW9ucyB9ID0gZXZlbnQuZGV0YWlsO1xuICAgICAgICBpZiAob3B0aW9ucy5hYm9ydCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuYWJvcnRDb250cm9sbGVycy5hZGQoYWJvcnRDb250cm9sbGVyKTtcbiAgICAgICAgICAgIG9wdGlvbnMuY2xlYXJBYm9ydEV4dGVuc2lvbiA9ICgpID0+IHRoaXMuYWJvcnRDb250cm9sbGVycy5kZWxldGUoYWJvcnRDb250cm9sbGVyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZW1vdmVBYm9ydENvbnRyb2xsZXIoZXZlbnQpIHtcbiAgICAgICAgY29uc3QgeyBvcHRpb25zIH0gPSBldmVudC5kZXRhaWw7XG4gICAgICAgIGlmIChvcHRpb25zLmFib3J0ICE9PSBmYWxzZSAmJiAhIW9wdGlvbnMuY2xlYXJBYm9ydEV4dGVuc2lvbikge1xuICAgICAgICAgICAgb3B0aW9ucy5jbGVhckFib3J0RXh0ZW5zaW9uKCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmNsYXNzIFVuaXF1ZUV4dGVuc2lvbiB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuYWJvcnRDb250cm9sbGVycyA9IG5ldyBNYXAoKTtcbiAgICB9XG4gICAgaW5pdGlhbGl6ZShuYWphKSB7XG4gICAgICAgIG5hamEudWlIYW5kbGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2ludGVyYWN0aW9uJywgdGhpcy5jaGVja1VuaXF1ZW5lc3MuYmluZCh0aGlzKSk7XG4gICAgICAgIG5hamEuYWRkRXZlbnRMaXN0ZW5lcignc3RhcnQnLCB0aGlzLmFib3J0UHJldmlvdXNSZXF1ZXN0LmJpbmQodGhpcykpO1xuICAgICAgICBuYWphLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbXBsZXRlJywgdGhpcy5jbGVhclJlcXVlc3QuYmluZCh0aGlzKSk7XG4gICAgfVxuICAgIGNoZWNrVW5pcXVlbmVzcyhldmVudCkge1xuICAgICAgICBjb25zdCB7IGVsZW1lbnQsIG9wdGlvbnMgfSA9IGV2ZW50LmRldGFpbDtcbiAgICAgICAgaWYgKGVsZW1lbnQuaGFzQXR0cmlidXRlKCdkYXRhLW5hamEtdW5pcXVlJykgPz8gZWxlbWVudC5mb3JtPy5oYXNBdHRyaWJ1dGUoJ2RhdGEtbmFqYS11bmlxdWUnKSkge1xuICAgICAgICAgICAgY29uc3QgdW5pcXVlID0gZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtbmFqYS11bmlxdWUnKSA/PyBlbGVtZW50LmZvcm0/LmdldEF0dHJpYnV0ZSgnZGF0YS1uYWphLXVuaXF1ZScpO1xuICAgICAgICAgICAgb3B0aW9ucy51bmlxdWUgPSB1bmlxdWUgPT09ICdvZmYnID8gZmFsc2UgOiB1bmlxdWUgPz8gJ2RlZmF1bHQnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFib3J0UHJldmlvdXNSZXF1ZXN0KGV2ZW50KSB7XG4gICAgICAgIGNvbnN0IHsgYWJvcnRDb250cm9sbGVyLCBvcHRpb25zIH0gPSBldmVudC5kZXRhaWw7XG4gICAgICAgIGlmIChvcHRpb25zLnVuaXF1ZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuYWJvcnRDb250cm9sbGVycy5nZXQob3B0aW9ucy51bmlxdWUgPz8gJ2RlZmF1bHQnKT8uYWJvcnQoKTtcbiAgICAgICAgICAgIHRoaXMuYWJvcnRDb250cm9sbGVycy5zZXQob3B0aW9ucy51bmlxdWUgPz8gJ2RlZmF1bHQnLCBhYm9ydENvbnRyb2xsZXIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNsZWFyUmVxdWVzdChldmVudCkge1xuICAgICAgICBjb25zdCB7IHJlcXVlc3QsIG9wdGlvbnMgfSA9IGV2ZW50LmRldGFpbDtcbiAgICAgICAgaWYgKCFyZXF1ZXN0LnNpZ25hbC5hYm9ydGVkICYmIG9wdGlvbnMudW5pcXVlICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5hYm9ydENvbnRyb2xsZXJzLmRlbGV0ZShvcHRpb25zLnVuaXF1ZSA/PyAnZGVmYXVsdCcpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5jb25zdCBuYWphID0gbmV3IE5hamEoKTtcbm5hamEucmVnaXN0ZXJFeHRlbnNpb24obmV3IEFib3J0RXh0ZW5zaW9uKCkpO1xubmFqYS5yZWdpc3RlckV4dGVuc2lvbihuZXcgVW5pcXVlRXh0ZW5zaW9uKCkpO1xuXG5leHBvcnQgeyBIdHRwRXJyb3IsIE5hamEsIG5hamEgYXMgZGVmYXVsdCB9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9TmFqYS5lc20uanMubWFwXG4iLCIvKiohXHJcbiAqIE5ldHRlRm9ybXMgLSBzaW1wbGUgZm9ybSB2YWxpZGF0aW9uLlxyXG4gKlxyXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgTmV0dGUgRnJhbWV3b3JrIChodHRwczovL25ldHRlLm9yZylcclxuICogQ29weXJpZ2h0IChjKSAyMDA0IERhdmlkIEdydWRsIChodHRwczovL2RhdmlkZ3J1ZGwuY29tKVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBAdHlwZWRlZiB7SFRNTElucHV0RWxlbWVudHxIVE1MVGV4dEFyZWFFbGVtZW50fEhUTUxTZWxlY3RFbGVtZW50fEhUTUxCdXR0b25FbGVtZW50fSBGb3JtRWxlbWVudFxyXG4gKiBAdHlwZWRlZiB7e29wOiBzdHJpbmcsIG5lZzogYm9vbGVhbiwgbXNnOiBzdHJpbmcsIGFyZzogKiwgcnVsZXM6ID9BcnJheTxSdWxlPiwgY29udHJvbDogc3RyaW5nLCB0b2dnbGU6ID9BcnJheTxzdHJpbmc+fX0gUnVsZVxyXG4gKi9cclxuXHJcbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XHJcblx0aWYgKCFnbG9iYWwuSlNPTikge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0aWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG5cdFx0ZGVmaW5lKCgpID0+IGZhY3RvcnkoZ2xvYmFsKSk7XHJcblx0fSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoZ2xvYmFsKTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0bGV0IGluaXQgPSAhZ2xvYmFsLk5ldHRlPy5ub0luaXQ7XHJcblx0XHRnbG9iYWwuTmV0dGUgPSBmYWN0b3J5KGdsb2JhbCk7XHJcblx0XHRpZiAoaW5pdCkge1xyXG5cdFx0XHRnbG9iYWwuTmV0dGUuaW5pdE9uTG9hZCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcbn0odHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB0aGlzLCAod2luZG93KSA9PiB7XHJcblx0J3VzZSBzdHJpY3QnO1xyXG5cclxuXHRjb25zdCBOZXR0ZSA9IHt9O1xyXG5cdGxldCBwcmV2ZW50RmlsdGVyaW5nID0ge307XHJcblx0bGV0IGZvcm1Ub2dnbGVzID0ge307XHJcblx0bGV0IHRvZ2dsZUxpc3RlbmVycyA9IG5ldyB3aW5kb3cuV2Vha01hcCgpO1xyXG5cclxuXHROZXR0ZS5mb3JtRXJyb3JzID0gW107XHJcblx0TmV0dGUudmVyc2lvbiA9ICczLjMuMCc7XHJcblxyXG5cclxuXHQvKipcclxuXHQgKiBAcGFyYW0ge0hUTUxGb3JtRWxlbWVudH0gZm9ybVxyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXHJcblx0ICogQHJldHVybiB7P0Zvcm1FbGVtZW50fVxyXG5cdCAqL1xyXG5cdGZ1bmN0aW9uIGdldEZvcm1FbGVtZW50KGZvcm0sIG5hbWUpIHtcclxuXHRcdGxldCByZXMgPSBmb3JtLmVsZW1lbnRzLm5hbWVkSXRlbShuYW1lKTtcclxuXHRcdHJldHVybiByZXMgaW5zdGFuY2VvZiBSYWRpb05vZGVMaXN0ID8gcmVzWzBdIDogcmVzO1xyXG5cdH1cclxuXHJcblxyXG5cdC8qKlxyXG5cdCAqIEBwYXJhbSB7Rm9ybUVsZW1lbnR9IGVsZW1cclxuXHQgKiBAcmV0dXJuIHtBcnJheTxGb3JtRWxlbWVudD59XHJcblx0ICovXHJcblx0ZnVuY3Rpb24gZXhwYW5kUmFkaW9FbGVtZW50KGVsZW0pIHtcclxuXHRcdGxldCByZXMgPSBlbGVtLmZvcm0uZWxlbWVudHMubmFtZWRJdGVtKGVsZW0ubmFtZSk7XHJcblx0XHRyZXR1cm4gcmVzIGluc3RhbmNlb2YgUmFkaW9Ob2RlTGlzdCA/IEFycmF5LmZyb20ocmVzKSA6IFtyZXNdO1xyXG5cdH1cclxuXHJcblxyXG5cdC8qKlxyXG5cdCAqIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiB0aGUgRE9NIGlzIGZ1bGx5IGxvYWRlZC5cclxuXHQgKiBAcHJpdmF0ZVxyXG5cdCAqL1xyXG5cdE5ldHRlLm9uRG9jdW1lbnRSZWFkeSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG5cdFx0aWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgIT09ICdsb2FkaW5nJykge1xyXG5cdFx0XHRjYWxsYmFjay5jYWxsKHRoaXMpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGNhbGxiYWNrKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHJcblx0LyoqXHJcblx0ICogUmV0dXJucyB0aGUgdmFsdWUgb2YgZm9ybSBlbGVtZW50LlxyXG5cdCAqIEBwYXJhbSB7Rm9ybUVsZW1lbnR8UmFkaW9Ob2RlTGlzdH0gZWxlbVxyXG5cdCAqIEByZXR1cm4geyp9XHJcblx0ICovXHJcblx0TmV0dGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoZWxlbSkge1xyXG5cdFx0aWYgKGVsZW0gaW5zdGFuY2VvZiBIVE1MSW5wdXRFbGVtZW50KSB7XHJcblx0XHRcdGlmIChlbGVtLnR5cGUgPT09ICdyYWRpbycpIHtcclxuXHRcdFx0XHRyZXR1cm4gZXhwYW5kUmFkaW9FbGVtZW50KGVsZW0pXHJcblx0XHRcdFx0XHQuZmluZCgoaW5wdXQpID0+IGlucHV0LmNoZWNrZWQpXHJcblx0XHRcdFx0XHQ/LnZhbHVlID8/IG51bGw7XHJcblxyXG5cdFx0XHR9IGVsc2UgaWYgKGVsZW0udHlwZSA9PT0gJ2ZpbGUnKSB7XHJcblx0XHRcdFx0cmV0dXJuIGVsZW0uZmlsZXM7XHJcblxyXG5cdFx0XHR9IGVsc2UgaWYgKGVsZW0udHlwZSA9PT0gJ2NoZWNrYm94Jykge1xyXG5cdFx0XHRcdHJldHVybiBlbGVtLm5hbWUuZW5kc1dpdGgoJ1tdJykgLy8gY2hlY2tib3ggbGlzdFxyXG5cdFx0XHRcdFx0PyBleHBhbmRSYWRpb0VsZW1lbnQoZWxlbSlcclxuXHRcdFx0XHRcdFx0LmZpbHRlcigoaW5wdXQpID0+IGlucHV0LmNoZWNrZWQpXHJcblx0XHRcdFx0XHRcdC5tYXAoKGlucHV0KSA9PiBpbnB1dC52YWx1ZSlcclxuXHRcdFx0XHRcdDogZWxlbS5jaGVja2VkO1xyXG5cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZXR1cm4gZWxlbS52YWx1ZS50cmltKCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHR9IGVsc2UgaWYgKGVsZW0gaW5zdGFuY2VvZiBIVE1MU2VsZWN0RWxlbWVudCkge1xyXG5cdFx0XHRyZXR1cm4gZWxlbS5tdWx0aXBsZVxyXG5cdFx0XHRcdD8gQXJyYXkuZnJvbShlbGVtLnNlbGVjdGVkT3B0aW9ucywgKG9wdGlvbikgPT4gb3B0aW9uLnZhbHVlKVxyXG5cdFx0XHRcdDogZWxlbS5zZWxlY3RlZE9wdGlvbnNbMF0/LnZhbHVlID8/IG51bGw7XHJcblxyXG5cdFx0fSBlbHNlIGlmIChlbGVtIGluc3RhbmNlb2YgSFRNTFRleHRBcmVhRWxlbWVudCkge1xyXG5cdFx0XHRyZXR1cm4gZWxlbS52YWx1ZTtcclxuXHJcblx0XHR9IGVsc2UgaWYgKGVsZW0gaW5zdGFuY2VvZiBSYWRpb05vZGVMaXN0KSB7XHJcblx0XHRcdHJldHVybiBOZXR0ZS5nZXRWYWx1ZShlbGVtWzBdKTtcclxuXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHJcblx0LyoqXHJcblx0ICogUmV0dXJucyB0aGUgZWZmZWN0aXZlIHZhbHVlIG9mIGZvcm0gZWxlbWVudC5cclxuXHQgKiBAcGFyYW0ge0Zvcm1FbGVtZW50fSBlbGVtXHJcblx0ICogQHBhcmFtIHtib29sZWFufSBmaWx0ZXJcclxuXHQgKiBAcmV0dXJuIHsqfVxyXG5cdCAqL1xyXG5cdE5ldHRlLmdldEVmZmVjdGl2ZVZhbHVlID0gZnVuY3Rpb24gKGVsZW0sIGZpbHRlciA9IGZhbHNlKSB7XHJcblx0XHRsZXQgdmFsID0gTmV0dGUuZ2V0VmFsdWUoZWxlbSk7XHJcblx0XHRpZiAodmFsID09PSBlbGVtLmdldEF0dHJpYnV0ZSgnZGF0YS1uZXR0ZS1lbXB0eS12YWx1ZScpKSB7XHJcblx0XHRcdHZhbCA9ICcnO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGZpbHRlciAmJiBwcmV2ZW50RmlsdGVyaW5nW2VsZW0ubmFtZV0gPT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRwcmV2ZW50RmlsdGVyaW5nW2VsZW0ubmFtZV0gPSB0cnVlO1xyXG5cdFx0XHRsZXQgcmVmID0ge3ZhbHVlOiB2YWx9O1xyXG5cdFx0XHROZXR0ZS52YWxpZGF0ZUNvbnRyb2woZWxlbSwgbnVsbCwgdHJ1ZSwgcmVmKTtcclxuXHRcdFx0dmFsID0gcmVmLnZhbHVlO1xyXG5cdFx0XHRkZWxldGUgcHJldmVudEZpbHRlcmluZ1tlbGVtLm5hbWVdO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHZhbDtcclxuXHR9O1xyXG5cclxuXHJcblx0LyoqXHJcblx0ICogVmFsaWRhdGVzIGZvcm0gZWxlbWVudCBhZ2FpbnN0IGdpdmVuIHJ1bGVzLlxyXG5cdCAqIEBwYXJhbSB7Rm9ybUVsZW1lbnR9IGVsZW1cclxuXHQgKiBAcGFyYW0gez9BcnJheTxSdWxlPn0gcnVsZXNcclxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IG9ubHlDaGVja1xyXG5cdCAqIEBwYXJhbSB7P3t2YWx1ZTogKn19IHZhbHVlXHJcblx0ICogQHBhcmFtIHs/Ym9vbGVhbn0gZW1wdHlPcHRpb25hbFxyXG5cdCAqIEByZXR1cm4ge2Jvb2xlYW59XHJcblx0ICovXHJcblx0TmV0dGUudmFsaWRhdGVDb250cm9sID0gZnVuY3Rpb24gKGVsZW0sIHJ1bGVzLCBvbmx5Q2hlY2sgPSBmYWxzZSwgdmFsdWUgPSBudWxsLCBlbXB0eU9wdGlvbmFsID0gbnVsbCkge1xyXG5cdFx0cnVsZXMgPz89IEpTT04ucGFyc2UoZWxlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtbmV0dGUtcnVsZXMnKSA/PyAnW10nKTtcclxuXHRcdHZhbHVlID8/PSB7dmFsdWU6IE5ldHRlLmdldEVmZmVjdGl2ZVZhbHVlKGVsZW0pfTtcclxuXHRcdGVtcHR5T3B0aW9uYWwgPz89ICFOZXR0ZS52YWxpZGF0ZVJ1bGUoZWxlbSwgJzpmaWxsZWQnLCBudWxsLCB2YWx1ZSk7XHJcblxyXG5cdFx0Zm9yIChsZXQgcnVsZSBvZiBydWxlcykge1xyXG5cdFx0XHRsZXQgb3AgPSBydWxlLm9wLm1hdGNoKC8ofik/KFteP10rKS8pLFxyXG5cdFx0XHRcdGN1ckVsZW0gPSBydWxlLmNvbnRyb2wgPyBnZXRGb3JtRWxlbWVudChlbGVtLmZvcm0sIHJ1bGUuY29udHJvbCkgOiBlbGVtO1xyXG5cclxuXHRcdFx0cnVsZS5uZWcgPSBvcFsxXTtcclxuXHRcdFx0cnVsZS5vcCA9IG9wWzJdO1xyXG5cdFx0XHRydWxlLmNvbmRpdGlvbiA9ICEhcnVsZS5ydWxlcztcclxuXHJcblx0XHRcdGlmICghY3VyRWxlbSkge1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGVtcHR5T3B0aW9uYWwgJiYgIXJ1bGUuY29uZGl0aW9uICYmIHJ1bGUub3AgIT09ICc6ZmlsbGVkJykge1xyXG5cdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsZXQgc3VjY2VzcyA9IE5ldHRlLnZhbGlkYXRlUnVsZShjdXJFbGVtLCBydWxlLm9wLCBydWxlLmFyZywgZWxlbSA9PT0gY3VyRWxlbSA/IHZhbHVlIDogdW5kZWZpbmVkKTtcclxuXHRcdFx0aWYgKHN1Y2Nlc3MgPT09IG51bGwpIHtcclxuXHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0fSBlbHNlIGlmIChydWxlLm5lZykge1xyXG5cdFx0XHRcdHN1Y2Nlc3MgPSAhc3VjY2VzcztcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHJ1bGUuY29uZGl0aW9uICYmIHN1Y2Nlc3MpIHtcclxuXHRcdFx0XHRpZiAoIU5ldHRlLnZhbGlkYXRlQ29udHJvbChlbGVtLCBydWxlLnJ1bGVzLCBvbmx5Q2hlY2ssIHZhbHVlLCBydWxlLm9wID09PSAnOmJsYW5rJyA/IGZhbHNlIDogZW1wdHlPcHRpb25hbCkpIHtcclxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSBpZiAoIXJ1bGUuY29uZGl0aW9uICYmICFzdWNjZXNzKSB7XHJcblx0XHRcdFx0aWYgKE5ldHRlLmlzRGlzYWJsZWQoY3VyRWxlbSkpIHtcclxuXHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIW9ubHlDaGVjaykge1xyXG5cdFx0XHRcdFx0bGV0IGFyciA9IEFycmF5LmlzQXJyYXkocnVsZS5hcmcpID8gcnVsZS5hcmcgOiBbcnVsZS5hcmddLFxyXG5cdFx0XHRcdFx0XHRtZXNzYWdlID0gcnVsZS5tc2cucmVwbGFjZShcclxuXHRcdFx0XHRcdFx0XHQvJSh2YWx1ZXxcXGQrKS9nLFxyXG5cdFx0XHRcdFx0XHRcdChmb28sIG0pID0+IE5ldHRlLmdldFZhbHVlKG0gPT09ICd2YWx1ZScgPyBjdXJFbGVtIDogZWxlbS5mb3JtLmVsZW1lbnRzLm5hbWVkSXRlbShhcnJbbV0uY29udHJvbCkpXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHROZXR0ZS5hZGRFcnJvcihjdXJFbGVtLCBtZXNzYWdlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fTtcclxuXHJcblxyXG5cdC8qKlxyXG5cdCAqIFZhbGlkYXRlcyB3aG9sZSBmb3JtLlxyXG5cdCAqIEBwYXJhbSB7SFRNTEZvcm1FbGVtZW50fSBzZW5kZXJcclxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IG9ubHlDaGVja1xyXG5cdCAqIEByZXR1cm4ge2Jvb2xlYW59XHJcblx0ICovXHJcblx0TmV0dGUudmFsaWRhdGVGb3JtID0gZnVuY3Rpb24gKHNlbmRlciwgb25seUNoZWNrID0gZmFsc2UpIHtcclxuXHRcdGxldCBmb3JtID0gc2VuZGVyLmZvcm0gPz8gc2VuZGVyLFxyXG5cdFx0XHRzY29wZTtcclxuXHJcblx0XHROZXR0ZS5mb3JtRXJyb3JzID0gW107XHJcblxyXG5cdFx0aWYgKGZvcm1bJ25ldHRlLXN1Ym1pdHRlZEJ5J10gJiYgZm9ybVsnbmV0dGUtc3VibWl0dGVkQnknXS5nZXRBdHRyaWJ1dGUoJ2Zvcm1ub3ZhbGlkYXRlJykgIT09IG51bGwpIHtcclxuXHRcdFx0bGV0IHNjb3BlQXJyID0gSlNPTi5wYXJzZShmb3JtWyduZXR0ZS1zdWJtaXR0ZWRCeSddLmdldEF0dHJpYnV0ZSgnZGF0YS1uZXR0ZS12YWxpZGF0aW9uLXNjb3BlJykgPz8gJ1tdJyk7XHJcblx0XHRcdGlmIChzY29wZUFyci5sZW5ndGgpIHtcclxuXHRcdFx0XHRzY29wZSA9IG5ldyBSZWdFeHAoJ14oJyArIHNjb3BlQXJyLmpvaW4oJy18JykgKyAnLSknKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHROZXR0ZS5zaG93Rm9ybUVycm9ycyhmb3JtLCBbXSk7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRmb3IgKGxldCBlbGVtIG9mIGZvcm0uZWxlbWVudHMpIHtcclxuXHRcdFx0aWYgKGVsZW0ud2lsbFZhbGlkYXRlICYmIGVsZW0udmFsaWRpdHkuYmFkSW5wdXQpIHtcclxuXHRcdFx0XHRlbGVtLnJlcG9ydFZhbGlkaXR5KCk7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Zm9yIChsZXQgZWxlbSBvZiBBcnJheS5mcm9tKGZvcm0uZWxlbWVudHMpKSB7XHJcblx0XHRcdGlmIChlbGVtLmdldEF0dHJpYnV0ZSgnZGF0YS1uZXR0ZS1ydWxlcycpXHJcblx0XHRcdFx0JiYgKCFzY29wZSB8fCBlbGVtLm5hbWUucmVwbGFjZSgvXVxcW3xcXFt8XXwkL2csICctJykubWF0Y2goc2NvcGUpKVxyXG5cdFx0XHRcdCYmICFOZXR0ZS5pc0Rpc2FibGVkKGVsZW0pXHJcblx0XHRcdFx0JiYgIU5ldHRlLnZhbGlkYXRlQ29udHJvbChlbGVtLCBudWxsLCBvbmx5Q2hlY2spXHJcblx0XHRcdFx0JiYgIU5ldHRlLmZvcm1FcnJvcnMubGVuZ3RoXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBzdWNjZXNzID0gIU5ldHRlLmZvcm1FcnJvcnMubGVuZ3RoO1xyXG5cdFx0TmV0dGUuc2hvd0Zvcm1FcnJvcnMoZm9ybSwgTmV0dGUuZm9ybUVycm9ycyk7XHJcblx0XHRyZXR1cm4gc3VjY2VzcztcclxuXHR9O1xyXG5cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgaW5wdXQgaXMgZGlzYWJsZWQuXHJcblx0ICogQHBhcmFtIHtGb3JtRWxlbWVudH0gZWxlbVxyXG5cdCAqIEByZXR1cm4ge2Jvb2xlYW59XHJcblx0ICovXHJcblx0TmV0dGUuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uIChlbGVtKSB7XHJcblx0XHRpZiAoZWxlbS50eXBlID09PSAncmFkaW8nKSB7XHJcblx0XHRcdHJldHVybiBleHBhbmRSYWRpb0VsZW1lbnQoZWxlbSlcclxuXHRcdFx0XHQuZXZlcnkoKGlucHV0KSA9PiBpbnB1dC5kaXNhYmxlZCk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZWxlbS5kaXNhYmxlZDtcclxuXHR9O1xyXG5cclxuXHJcblx0LyoqXHJcblx0ICogQWRkcyBlcnJvciBtZXNzYWdlIHRvIHRoZSBxdWV1ZS5cclxuXHQgKiBAcGFyYW0ge0Zvcm1FbGVtZW50fSBlbGVtXHJcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2VcclxuXHQgKi9cclxuXHROZXR0ZS5hZGRFcnJvciA9IGZ1bmN0aW9uIChlbGVtLCBtZXNzYWdlKSB7XHJcblx0XHROZXR0ZS5mb3JtRXJyb3JzLnB1c2goe1xyXG5cdFx0XHRlbGVtZW50OiBlbGVtLFxyXG5cdFx0XHRtZXNzYWdlOiBtZXNzYWdlXHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHJcblx0LyoqXHJcblx0ICogRGlzcGxheSBlcnJvciBtZXNzYWdlcy5cclxuXHQgKiBAcGFyYW0ge0hUTUxGb3JtRWxlbWVudH0gZm9ybVxyXG5cdCAqIEBwYXJhbSB7QXJyYXk8e2VsZW1lbnQ6IEZvcm1FbGVtZW50LCBtZXNzYWdlOiBzdHJpbmd9Pn0gZXJyb3JzXHJcblx0ICovXHJcblx0TmV0dGUuc2hvd0Zvcm1FcnJvcnMgPSBmdW5jdGlvbiAoZm9ybSwgZXJyb3JzKSB7XHJcblx0XHRsZXQgbWVzc2FnZXMgPSBbXSxcclxuXHRcdFx0Zm9jdXNFbGVtO1xyXG5cclxuXHRcdGZvciAobGV0IGVycm9yIG9mIGVycm9ycykge1xyXG5cdFx0XHRpZiAobWVzc2FnZXMuaW5kZXhPZihlcnJvci5tZXNzYWdlKSA8IDApIHtcclxuXHRcdFx0XHRtZXNzYWdlcy5wdXNoKGVycm9yLm1lc3NhZ2UpO1xyXG5cclxuXHRcdFx0XHRpZiAoIWZvY3VzRWxlbSAmJiBlcnJvci5lbGVtZW50LmZvY3VzKSB7XHJcblx0XHRcdFx0XHRmb2N1c0VsZW0gPSBlcnJvci5lbGVtZW50O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChtZXNzYWdlcy5sZW5ndGgpIHtcclxuXHRcdFx0TmV0dGUuc2hvd01vZGFsKG1lc3NhZ2VzLmpvaW4oJ1xcbicpLCAoKSA9PiB7XHJcblx0XHRcdFx0aWYgKGZvY3VzRWxlbSkge1xyXG5cdFx0XHRcdFx0Zm9jdXNFbGVtLmZvY3VzKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHJcblx0LyoqXHJcblx0ICogRGlzcGxheSBtb2RhbCB3aW5kb3cuXHJcblx0ICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2VcclxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBvbmNsb3NlXHJcblx0ICovXHJcblx0TmV0dGUuc2hvd01vZGFsID0gZnVuY3Rpb24gKG1lc3NhZ2UsIG9uY2xvc2UpIHtcclxuXHRcdGxldCBkaWFsb2cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaWFsb2cnKTtcclxuXHJcblx0XHRpZiAoIWRpYWxvZy5zaG93TW9kYWwpIHtcclxuXHRcdFx0YWxlcnQobWVzc2FnZSk7XHJcblx0XHRcdG9uY2xvc2UoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcblx0XHRzdHlsZS5pbm5lclRleHQgPSAnLm5ldHRlRm9ybXNNb2RhbCB7IHRleHQtYWxpZ246IGNlbnRlcjsgbWFyZ2luOiBhdXRvOyBib3JkZXI6IDJweCBzb2xpZCBibGFjazsgcGFkZGluZzogMXJlbSB9IC5uZXR0ZUZvcm1zTW9kYWwgYnV0dG9uIHsgcGFkZGluZzogLjFlbSAyZW0gfSc7XHJcblxyXG5cdFx0bGV0IGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xyXG5cdFx0YnV0dG9uLmlubmVyVGV4dCA9ICdPSyc7XHJcblx0XHRidXR0b24ub25jbGljayA9ICgpID0+IHtcclxuXHRcdFx0ZGlhbG9nLnJlbW92ZSgpO1xyXG5cdFx0XHRvbmNsb3NlKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGRpYWxvZy5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ25ldHRlRm9ybXNNb2RhbCcpO1xyXG5cdFx0ZGlhbG9nLmlubmVyVGV4dCA9IG1lc3NhZ2UgKyAnXFxuXFxuJztcclxuXHRcdGRpYWxvZy5hcHBlbmQoc3R5bGUsIGJ1dHRvbik7XHJcblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZChkaWFsb2cpO1xyXG5cdFx0ZGlhbG9nLnNob3dNb2RhbCgpO1xyXG5cdH07XHJcblxyXG5cclxuXHQvKipcclxuXHQgKiBWYWxpZGF0ZXMgc2luZ2xlIHJ1bGUuXHJcblx0ICogQHBhcmFtIHtGb3JtRWxlbWVudH0gZWxlbVxyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBvcFxyXG5cdCAqIEBwYXJhbSB7Kn0gYXJnXHJcblx0ICogQHBhcmFtIHs/e3ZhbHVlOiAqfX0gdmFsdWVcclxuXHQgKi9cclxuXHROZXR0ZS52YWxpZGF0ZVJ1bGUgPSBmdW5jdGlvbiAoZWxlbSwgb3AsIGFyZywgdmFsdWUpIHtcclxuXHRcdGlmIChlbGVtLnZhbGlkaXR5LmJhZElucHV0KSB7XHJcblx0XHRcdHJldHVybiBvcCA9PT0gJzpmaWxsZWQnO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhbHVlID8/PSB7dmFsdWU6IE5ldHRlLmdldEVmZmVjdGl2ZVZhbHVlKGVsZW0sIHRydWUpfTtcclxuXHJcblx0XHRsZXQgbWV0aG9kID0gb3AuY2hhckF0KDApID09PSAnOicgPyBvcC5zdWJzdHJpbmcoMSkgOiBvcDtcclxuXHRcdG1ldGhvZCA9IG1ldGhvZC5yZXBsYWNlKCc6OicsICdfJykucmVwbGFjZUFsbCgnXFxcXCcsICcnKTtcclxuXHJcblx0XHRsZXQgYXJncyA9IEFycmF5LmlzQXJyYXkoYXJnKSA/IGFyZyA6IFthcmddO1xyXG5cdFx0YXJncyA9IGFyZ3MubWFwKChhcmcpID0+IHtcclxuXHRcdFx0aWYgKGFyZz8uY29udHJvbCkge1xyXG5cdFx0XHRcdGxldCBjb250cm9sID0gZ2V0Rm9ybUVsZW1lbnQoZWxlbS5mb3JtLCBhcmcuY29udHJvbCk7XHJcblx0XHRcdFx0cmV0dXJuIGNvbnRyb2wgPT09IGVsZW0gPyB2YWx1ZS52YWx1ZSA6IE5ldHRlLmdldEVmZmVjdGl2ZVZhbHVlKGNvbnRyb2wsIHRydWUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBhcmc7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gTmV0dGUudmFsaWRhdG9yc1ttZXRob2RdXHJcblx0XHRcdD8gTmV0dGUudmFsaWRhdG9yc1ttZXRob2RdKGVsZW0sIEFycmF5LmlzQXJyYXkoYXJnKSA/IGFyZ3MgOiBhcmdzWzBdLCB2YWx1ZS52YWx1ZSwgdmFsdWUpXHJcblx0XHRcdDogbnVsbDtcclxuXHR9O1xyXG5cclxuXHJcblx0TmV0dGUudmFsaWRhdG9ycyA9IHtcclxuXHRcdGZpbGxlZDogZnVuY3Rpb24gKGVsZW0sIGFyZywgdmFsKSB7XHJcblx0XHRcdHJldHVybiB2YWwgIT09ICcnICYmIHZhbCAhPT0gZmFsc2UgJiYgdmFsICE9PSBudWxsXHJcblx0XHRcdFx0JiYgKCFBcnJheS5pc0FycmF5KHZhbCkgfHwgISF2YWwubGVuZ3RoKVxyXG5cdFx0XHRcdCYmICghKHZhbCBpbnN0YW5jZW9mIEZpbGVMaXN0KSB8fCB2YWwubGVuZ3RoKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0Ymxhbms6IGZ1bmN0aW9uIChlbGVtLCBhcmcsIHZhbCkge1xyXG5cdFx0XHRyZXR1cm4gIU5ldHRlLnZhbGlkYXRvcnMuZmlsbGVkKGVsZW0sIGFyZywgdmFsKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0dmFsaWQ6IGZ1bmN0aW9uIChlbGVtKSB7XHJcblx0XHRcdHJldHVybiBOZXR0ZS52YWxpZGF0ZUNvbnRyb2woZWxlbSwgbnVsbCwgdHJ1ZSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdGVxdWFsOiBmdW5jdGlvbiAoZWxlbSwgYXJnLCB2YWwpIHtcclxuXHRcdFx0aWYgKGFyZyA9PT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGxldCB0b1N0cmluZyA9ICh2YWwpID0+IHtcclxuXHRcdFx0XHRpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicgfHwgdHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcclxuXHRcdFx0XHRcdHJldHVybiAnJyArIHZhbDtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHZhbCA9PT0gdHJ1ZSA/ICcxJyA6ICcnO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHZhbCA9IEFycmF5LmlzQXJyYXkodmFsKSA/IHZhbCA6IFt2YWxdO1xyXG5cdFx0XHRhcmcgPSBBcnJheS5pc0FycmF5KGFyZykgPyBhcmcgOiBbYXJnXTtcclxuXHRcdFx0bG9vcDpcclxuXHRcdFx0Zm9yIChsZXQgYSBvZiB2YWwpIHtcclxuXHRcdFx0XHRmb3IgKGxldCBiIG9mIGFyZykge1xyXG5cdFx0XHRcdFx0aWYgKHRvU3RyaW5nKGEpID09PSB0b1N0cmluZyhiKSkge1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZSBsb29wO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHZhbC5sZW5ndGggPiAwO1xyXG5cdFx0fSxcclxuXHJcblx0XHRub3RFcXVhbDogZnVuY3Rpb24gKGVsZW0sIGFyZywgdmFsKSB7XHJcblx0XHRcdHJldHVybiBhcmcgPT09IHVuZGVmaW5lZCA/IG51bGwgOiAhTmV0dGUudmFsaWRhdG9ycy5lcXVhbChlbGVtLCBhcmcsIHZhbCk7XHJcblx0XHR9LFxyXG5cclxuXHRcdG1pbkxlbmd0aDogZnVuY3Rpb24gKGVsZW0sIGFyZywgdmFsKSB7XHJcblx0XHRcdHZhbCA9IHR5cGVvZiB2YWwgPT09ICdudW1iZXInID8gdmFsLnRvU3RyaW5nKCkgOiB2YWw7XHJcblx0XHRcdHJldHVybiB2YWwubGVuZ3RoID49IGFyZztcclxuXHRcdH0sXHJcblxyXG5cdFx0bWF4TGVuZ3RoOiBmdW5jdGlvbiAoZWxlbSwgYXJnLCB2YWwpIHtcclxuXHRcdFx0dmFsID0gdHlwZW9mIHZhbCA9PT0gJ251bWJlcicgPyB2YWwudG9TdHJpbmcoKSA6IHZhbDtcclxuXHRcdFx0cmV0dXJuIHZhbC5sZW5ndGggPD0gYXJnO1xyXG5cdFx0fSxcclxuXHJcblx0XHRsZW5ndGg6IGZ1bmN0aW9uIChlbGVtLCBhcmcsIHZhbCkge1xyXG5cdFx0XHR2YWwgPSB0eXBlb2YgdmFsID09PSAnbnVtYmVyJyA/IHZhbC50b1N0cmluZygpIDogdmFsO1xyXG5cdFx0XHRhcmcgPSBBcnJheS5pc0FycmF5KGFyZykgPyBhcmcgOiBbYXJnLCBhcmddO1xyXG5cdFx0XHRyZXR1cm4gKGFyZ1swXSA9PT0gbnVsbCB8fCB2YWwubGVuZ3RoID49IGFyZ1swXSkgJiYgKGFyZ1sxXSA9PT0gbnVsbCB8fCB2YWwubGVuZ3RoIDw9IGFyZ1sxXSk7XHJcblx0XHR9LFxyXG5cclxuXHRcdGVtYWlsOiBmdW5jdGlvbiAoZWxlbSwgYXJnLCB2YWwpIHtcclxuXHRcdFx0cmV0dXJuICgvXihcIihbICEjLVtcXF0tfl18XFxcXFsgLX5dKStcInxbLWEtejAtOSEjJCUmJyorLz0/Xl9ge3x9fl0rKFxcLlstYS16MC05ISMkJSYnKisvPT9eX2B7fH1+XSspKilAKFswLTlhLXpcXHUwMEMwLVxcdTAyRkZcXHUwMzcwLVxcdTFFRkZdKFstMC05YS16XFx1MDBDMC1cXHUwMkZGXFx1MDM3MC1cXHUxRUZGXXswLDYxfVswLTlhLXpcXHUwMEMwLVxcdTAyRkZcXHUwMzcwLVxcdTFFRkZdKT9cXC4pK1thLXpcXHUwMEMwLVxcdTAyRkZcXHUwMzcwLVxcdTFFRkZdKFstMC05YS16XFx1MDBDMC1cXHUwMkZGXFx1MDM3MC1cXHUxRUZGXXswLDE3fVthLXpcXHUwMEMwLVxcdTAyRkZcXHUwMzcwLVxcdTFFRkZdKT8kL2kpLnRlc3QodmFsKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0dXJsOiBmdW5jdGlvbiAoZWxlbSwgYXJnLCB2YWwsIG5ld1ZhbHVlKSB7XHJcblx0XHRcdGlmICghKC9eW2EtelxcZCsuLV0rOi8pLnRlc3QodmFsKSkge1xyXG5cdFx0XHRcdHZhbCA9ICdodHRwczovLycgKyB2YWw7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCgvXmh0dHBzPzpcXC9cXC8oKChbLV8wLTlhLXpcXHUwMEMwLVxcdTAyRkZcXHUwMzcwLVxcdTFFRkZdK1xcLikqWzAtOWEtelxcdTAwQzAtXFx1MDJGRlxcdTAzNzAtXFx1MUVGRl0oWy0wLTlhLXpcXHUwMEMwLVxcdTAyRkZcXHUwMzcwLVxcdTFFRkZdezAsNjF9WzAtOWEtelxcdTAwQzAtXFx1MDJGRlxcdTAzNzAtXFx1MUVGRl0pP1xcLik/W2EtelxcdTAwQzAtXFx1MDJGRlxcdTAzNzAtXFx1MUVGRl0oWy0wLTlhLXpcXHUwMEMwLVxcdTAyRkZcXHUwMzcwLVxcdTFFRkZdezAsMTd9W2EtelxcdTAwQzAtXFx1MDJGRlxcdTAzNzAtXFx1MUVGRl0pP3xcXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfXxcXFtbMC05YS1mOl17MywzOX1cXF0pKDpcXGR7MSw1fSk/KFxcL1xcUyopPyQvaSkudGVzdCh2YWwpKSB7XHJcblx0XHRcdFx0bmV3VmFsdWUudmFsdWUgPSB2YWw7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fSxcclxuXHJcblx0XHRyZWdleHA6IGZ1bmN0aW9uIChlbGVtLCBhcmcsIHZhbCkge1xyXG5cdFx0XHRsZXQgcGFydHMgPSB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyA/IGFyZy5tYXRjaCgvXlxcLyguKilcXC8oW2ltdV0qKSQvKSA6IGZhbHNlO1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdHJldHVybiBwYXJ0cyAmJiAobmV3IFJlZ0V4cChwYXJ0c1sxXSwgcGFydHNbMl0ucmVwbGFjZSgndScsICcnKSkpLnRlc3QodmFsKTtcclxuXHRcdFx0fSBjYXRjaCB7fSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5XHJcblx0XHR9LFxyXG5cclxuXHRcdHBhdHRlcm46IGZ1bmN0aW9uIChlbGVtLCBhcmcsIHZhbCwgbmV3VmFsdWUsIGNhc2VJbnNlbnNpdGl2ZSkge1xyXG5cdFx0XHRpZiAodHlwZW9mIGFyZyAhPT0gJ3N0cmluZycpIHtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRsZXQgcmVnRXhwO1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRyZWdFeHAgPSBuZXcgUmVnRXhwKCdeKD86JyArIGFyZyArICcpJCcsIGNhc2VJbnNlbnNpdGl2ZSA/ICd1aScgOiAndScpO1xyXG5cdFx0XHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRcdFx0cmVnRXhwID0gbmV3IFJlZ0V4cCgnXig/OicgKyBhcmcgKyAnKSQnLCBjYXNlSW5zZW5zaXRpdmUgPyAnaScgOiAnJyk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRyZXR1cm4gdmFsIGluc3RhbmNlb2YgRmlsZUxpc3RcclxuXHRcdFx0XHRcdD8gQXJyYXkuZnJvbSh2YWwpLmV2ZXJ5KChmaWxlKSA9PiByZWdFeHAudGVzdChmaWxlLm5hbWUpKVxyXG5cdFx0XHRcdFx0OiByZWdFeHAudGVzdCh2YWwpO1xyXG5cdFx0XHR9IGNhdGNoIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcclxuXHRcdH0sXHJcblxyXG5cdFx0cGF0dGVybkNhc2VJbnNlbnNpdGl2ZTogZnVuY3Rpb24gKGVsZW0sIGFyZywgdmFsKSB7XHJcblx0XHRcdHJldHVybiBOZXR0ZS52YWxpZGF0b3JzLnBhdHRlcm4oZWxlbSwgYXJnLCB2YWwsIG51bGwsIHRydWUpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRudW1lcmljOiBmdW5jdGlvbiAoZWxlbSwgYXJnLCB2YWwpIHtcclxuXHRcdFx0cmV0dXJuICgvXlswLTldKyQvKS50ZXN0KHZhbCk7XHJcblx0XHR9LFxyXG5cclxuXHRcdGludGVnZXI6IGZ1bmN0aW9uIChlbGVtLCBhcmcsIHZhbCwgbmV3VmFsdWUpIHtcclxuXHRcdFx0aWYgKCgvXi0/WzAtOV0rJC8pLnRlc3QodmFsKSkge1xyXG5cdFx0XHRcdG5ld1ZhbHVlLnZhbHVlID0gcGFyc2VGbG9hdCh2YWwpO1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH0sXHJcblxyXG5cdFx0J2Zsb2F0JzogZnVuY3Rpb24gKGVsZW0sIGFyZywgdmFsLCBuZXdWYWx1ZSkge1xyXG5cdFx0XHR2YWwgPSB2YWwucmVwbGFjZSgvICsvZywgJycpLnJlcGxhY2UoLywvZywgJy4nKTtcclxuXHRcdFx0aWYgKCgvXi0/WzAtOV0qXFwuP1swLTldKyQvKS50ZXN0KHZhbCkpIHtcclxuXHRcdFx0XHRuZXdWYWx1ZS52YWx1ZSA9IHBhcnNlRmxvYXQodmFsKTtcclxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9LFxyXG5cclxuXHRcdG1pbjogZnVuY3Rpb24gKGVsZW0sIGFyZywgdmFsKSB7XHJcblx0XHRcdGlmIChOdW1iZXIuaXNGaW5pdGUoYXJnKSkge1xyXG5cdFx0XHRcdHZhbCA9IHBhcnNlRmxvYXQodmFsKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdmFsID49IGFyZztcclxuXHRcdH0sXHJcblxyXG5cdFx0bWF4OiBmdW5jdGlvbiAoZWxlbSwgYXJnLCB2YWwpIHtcclxuXHRcdFx0aWYgKE51bWJlci5pc0Zpbml0ZShhcmcpKSB7XHJcblx0XHRcdFx0dmFsID0gcGFyc2VGbG9hdCh2YWwpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB2YWwgPD0gYXJnO1xyXG5cdFx0fSxcclxuXHJcblx0XHRyYW5nZTogZnVuY3Rpb24gKGVsZW0sIGFyZywgdmFsKSB7XHJcblx0XHRcdGlmICghQXJyYXkuaXNBcnJheShhcmcpKSB7XHJcblx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblx0XHRcdH0gZWxzZSBpZiAoZWxlbS50eXBlID09PSAndGltZScgJiYgYXJnWzBdID4gYXJnWzFdKSB7XHJcblx0XHRcdFx0cmV0dXJuIHZhbCA+PSBhcmdbMF0gfHwgdmFsIDw9IGFyZ1sxXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gKGFyZ1swXSA9PT0gbnVsbCB8fCBOZXR0ZS52YWxpZGF0b3JzLm1pbihlbGVtLCBhcmdbMF0sIHZhbCkpXHJcblx0XHRcdFx0JiYgKGFyZ1sxXSA9PT0gbnVsbCB8fCBOZXR0ZS52YWxpZGF0b3JzLm1heChlbGVtLCBhcmdbMV0sIHZhbCkpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRzdWJtaXR0ZWQ6IGZ1bmN0aW9uIChlbGVtKSB7XHJcblx0XHRcdHJldHVybiBlbGVtLmZvcm1bJ25ldHRlLXN1Ym1pdHRlZEJ5J10gPT09IGVsZW07XHJcblx0XHR9LFxyXG5cclxuXHRcdGZpbGVTaXplOiBmdW5jdGlvbiAoZWxlbSwgYXJnLCB2YWwpIHtcclxuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odmFsKS5ldmVyeSgoZmlsZSkgPT4gZmlsZS5zaXplIDw9IGFyZyk7XHJcblx0XHR9LFxyXG5cclxuXHRcdG1pbWVUeXBlOiBmdW5jdGlvbiAoZWxlbSwgYXJncywgdmFsKSB7XHJcblx0XHRcdGxldCByZSA9IFtdO1xyXG5cdFx0XHRhcmdzID0gQXJyYXkuaXNBcnJheShhcmdzKSA/IGFyZ3MgOiBbYXJnc107XHJcblx0XHRcdGFyZ3MuZm9yRWFjaCgoYXJnKSA9PiByZS5wdXNoKCdeJyArIGFyZy5yZXBsYWNlKC8oW15cXHddKS9nLCAnXFxcXCQxJykucmVwbGFjZSgnXFxcXConLCAnLionKSArICckJykpO1xyXG5cdFx0XHRyZSA9IG5ldyBSZWdFeHAocmUuam9pbignfCcpKTtcclxuXHRcdFx0cmV0dXJuIEFycmF5LmZyb20odmFsKS5ldmVyeSgoZmlsZSkgPT4gIWZpbGUudHlwZSB8fCByZS50ZXN0KGZpbGUudHlwZSkpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRpbWFnZTogZnVuY3Rpb24gKGVsZW0sIGFyZywgdmFsKSB7XHJcblx0XHRcdHJldHVybiBOZXR0ZS52YWxpZGF0b3JzLm1pbWVUeXBlKGVsZW0sIGFyZyA/PyBbJ2ltYWdlL2dpZicsICdpbWFnZS9wbmcnLCAnaW1hZ2UvanBlZycsICdpbWFnZS93ZWJwJ10sIHZhbCk7XHJcblx0XHR9LFxyXG5cclxuXHRcdCdzdGF0aWMnOiBmdW5jdGlvbiAoZWxlbSwgYXJnKSB7XHJcblx0XHRcdHJldHVybiBhcmc7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblxyXG5cdC8qKlxyXG5cdCAqIFByb2Nlc3MgYWxsIHRvZ2dsZXMgaW4gZm9ybS5cclxuXHQgKiBAcGFyYW0ge0hUTUxGb3JtRWxlbWVudH0gZm9ybVxyXG5cdCAqIEBwYXJhbSB7P0V2ZW50fSBldmVudFxyXG5cdCAqL1xyXG5cdE5ldHRlLnRvZ2dsZUZvcm0gPSBmdW5jdGlvbiAoZm9ybSwgZXZlbnQgPSBudWxsKSB7XHJcblx0XHRmb3JtVG9nZ2xlcyA9IHt9O1xyXG5cdFx0Zm9yIChsZXQgZWxlbSBvZiBBcnJheS5mcm9tKGZvcm0uZWxlbWVudHMpKSB7XHJcblx0XHRcdGlmIChlbGVtLmdldEF0dHJpYnV0ZSgnZGF0YS1uZXR0ZS1ydWxlcycpKSB7XHJcblx0XHRcdFx0TmV0dGUudG9nZ2xlQ29udHJvbChlbGVtLCBudWxsLCBudWxsLCAhZXZlbnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Zm9yIChsZXQgaSBpbiBmb3JtVG9nZ2xlcykge1xyXG5cdFx0XHROZXR0ZS50b2dnbGUoaSwgZm9ybVRvZ2dsZXNbaV0uc3RhdGUsIGZvcm1Ub2dnbGVzW2ldLmVsZW0sIGV2ZW50KTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHJcblx0LyoqXHJcblx0ICogUHJvY2VzcyB0b2dnbGVzIG9uIGZvcm0gZWxlbWVudC5cclxuXHQgKiBAcGFyYW0ge0Zvcm1FbGVtZW50fSBlbGVtXHJcblx0ICogQHBhcmFtIHs/QXJyYXk8UnVsZT59IHJ1bGVzXHJcblx0ICogQHBhcmFtIHs/Ym9vbGVhbn0gc3VjY2Vzc1xyXG5cdCAqIEBwYXJhbSB7Ym9vbGVhbn0gZmlyc3R0aW1lXHJcblx0ICogQHBhcmFtIHs/e3ZhbHVlOiAqfX0gdmFsdWVcclxuXHQgKiBAcGFyYW0gez9ib29sZWFufSBlbXB0eU9wdGlvbmFsXHJcblx0ICogQHJldHVybiB7Ym9vbGVhbn1cclxuXHQgKi9cclxuXHROZXR0ZS50b2dnbGVDb250cm9sID0gZnVuY3Rpb24gKGVsZW0sIHJ1bGVzLCBzdWNjZXNzLCBmaXJzdHRpbWUsIHZhbHVlID0gbnVsbCwgZW1wdHlPcHRpb25hbCA9IG51bGwpIHtcclxuXHRcdHJ1bGVzID8/PSBKU09OLnBhcnNlKGVsZW0uZ2V0QXR0cmlidXRlKCdkYXRhLW5ldHRlLXJ1bGVzJykgPz8gJ1tdJyk7XHJcblx0XHR2YWx1ZSA/Pz0ge3ZhbHVlOiBOZXR0ZS5nZXRFZmZlY3RpdmVWYWx1ZShlbGVtKX07XHJcblx0XHRlbXB0eU9wdGlvbmFsID8/PSAhTmV0dGUudmFsaWRhdGVSdWxlKGVsZW0sICc6ZmlsbGVkJywgbnVsbCwgdmFsdWUpO1xyXG5cclxuXHRcdGxldCBoYXMgPSBmYWxzZSxcclxuXHRcdFx0Y3VyU3VjY2VzcztcclxuXHJcblx0XHRmb3IgKGxldCBydWxlIG9mIHJ1bGVzKSB7XHJcblx0XHRcdGxldCBvcCA9IHJ1bGUub3AubWF0Y2goLyh+KT8oW14/XSspLyksXHJcblx0XHRcdFx0Y3VyRWxlbSA9IHJ1bGUuY29udHJvbCA/IGdldEZvcm1FbGVtZW50KGVsZW0uZm9ybSwgcnVsZS5jb250cm9sKSA6IGVsZW07XHJcblxyXG5cdFx0XHRydWxlLm5lZyA9IG9wWzFdO1xyXG5cdFx0XHRydWxlLm9wID0gb3BbMl07XHJcblx0XHRcdHJ1bGUuY29uZGl0aW9uID0gISFydWxlLnJ1bGVzO1xyXG5cclxuXHRcdFx0aWYgKCFjdXJFbGVtKSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH0gZWxzZSBpZiAoZW1wdHlPcHRpb25hbCAmJiAhcnVsZS5jb25kaXRpb24gJiYgcnVsZS5vcCAhPT0gJzpmaWxsZWQnKSB7XHJcblx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGN1clN1Y2Nlc3MgPSBzdWNjZXNzO1xyXG5cdFx0XHRpZiAoc3VjY2VzcyAhPT0gZmFsc2UpIHtcclxuXHRcdFx0XHRjdXJTdWNjZXNzID0gTmV0dGUudmFsaWRhdGVSdWxlKGN1ckVsZW0sIHJ1bGUub3AsIHJ1bGUuYXJnLCBlbGVtID09PSBjdXJFbGVtID8gdmFsdWUgOiB1bmRlZmluZWQpO1xyXG5cdFx0XHRcdGlmIChjdXJTdWNjZXNzID09PSBudWxsKSB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHJcblx0XHRcdFx0fSBlbHNlIGlmIChydWxlLm5lZykge1xyXG5cdFx0XHRcdFx0Y3VyU3VjY2VzcyA9ICFjdXJTdWNjZXNzO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIXJ1bGUuY29uZGl0aW9uKSB7XHJcblx0XHRcdFx0XHRzdWNjZXNzID0gY3VyU3VjY2VzcztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICgocnVsZS5jb25kaXRpb24gJiYgTmV0dGUudG9nZ2xlQ29udHJvbChlbGVtLCBydWxlLnJ1bGVzLCBjdXJTdWNjZXNzLCBmaXJzdHRpbWUsIHZhbHVlLCBydWxlLm9wID09PSAnOmJsYW5rJyA/IGZhbHNlIDogZW1wdHlPcHRpb25hbCkpIHx8IHJ1bGUudG9nZ2xlKSB7XHJcblx0XHRcdFx0aGFzID0gdHJ1ZTtcclxuXHRcdFx0XHRpZiAoZmlyc3R0aW1lKSB7XHJcblx0XHRcdFx0XHRleHBhbmRSYWRpb0VsZW1lbnQoY3VyRWxlbSlcclxuXHRcdFx0XHRcdFx0LmZpbHRlcigoZWwpID0+ICF0b2dnbGVMaXN0ZW5lcnMuaGFzKGVsKSlcclxuXHRcdFx0XHRcdFx0LmZvckVhY2goKGVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKGUpID0+IE5ldHRlLnRvZ2dsZUZvcm0oZWxlbS5mb3JtLCBlKSk7XHJcblx0XHRcdFx0XHRcdFx0dG9nZ2xlTGlzdGVuZXJzLnNldChlbCwgbnVsbCk7XHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRmb3IgKGxldCBpZCBpbiBydWxlLnRvZ2dsZSA/PyBbXSkge1xyXG5cdFx0XHRcdFx0Zm9ybVRvZ2dsZXNbaWRdID8/PSB7ZWxlbTogZWxlbX07XHJcblx0XHRcdFx0XHRmb3JtVG9nZ2xlc1tpZF0uc3RhdGUgfHw9IHJ1bGUudG9nZ2xlW2lkXSA/IGN1clN1Y2Nlc3MgOiAhY3VyU3VjY2VzcztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBoYXM7XHJcblx0fTtcclxuXHJcblxyXG5cdC8qKlxyXG5cdCAqIERpc3BsYXlzIG9yIGhpZGVzIEhUTUwgZWxlbWVudC5cclxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3JcclxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IHZpc2libGVcclxuXHQgKiBAcGFyYW0ge0Zvcm1FbGVtZW50fSBzcmNFbGVtZW50XHJcblx0ICogQHBhcmFtIHtFdmVudH0gZXZlbnRcclxuXHQgKi9cclxuXHROZXR0ZS50b2dnbGUgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIHZpc2libGUsIHNyY0VsZW1lbnQsIGV2ZW50KSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW51c2VkLXZhcnNcclxuXHRcdGlmICgvXlxcd1tcXHcuOi1dKiQvLnRlc3Qoc2VsZWN0b3IpKSB7IC8vIGlkXHJcblx0XHRcdHNlbGVjdG9yID0gJyMnICsgc2VsZWN0b3I7XHJcblx0XHR9XHJcblx0XHRBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKVxyXG5cdFx0XHQuZm9yRWFjaCgoZWxlbSkgPT4gZWxlbS5oaWRkZW4gPSAhdmlzaWJsZSk7XHJcblx0fTtcclxuXHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbXBhY3QgY2hlY2tib3hlc1xyXG5cdCAqIEBwYXJhbSB7SFRNTEZvcm1FbGVtZW50fSBmb3JtXHJcblx0ICogQHBhcmFtIHtGb3JtRGF0YX0gZm9ybURhdGFcclxuXHQgKi9cclxuXHROZXR0ZS5jb21wYWN0Q2hlY2tib3hlcyA9IGZ1bmN0aW9uIChmb3JtLCBmb3JtRGF0YSkge1xyXG5cdFx0bGV0IHZhbHVlcyA9IHt9O1xyXG5cclxuXHRcdGZvciAobGV0IGVsZW0gb2YgZm9ybS5lbGVtZW50cykge1xyXG5cdFx0XHRpZiAoZWxlbSBpbnN0YW5jZW9mIEhUTUxJbnB1dEVsZW1lbnQgJiYgZWxlbS50eXBlID09PSAnY2hlY2tib3gnICYmIGVsZW0ubmFtZS5lbmRzV2l0aCgnW10nKSAmJiBlbGVtLmNoZWNrZWQgJiYgIWVsZW0uZGlzYWJsZWQpIHtcclxuXHRcdFx0XHRmb3JtRGF0YS5kZWxldGUoZWxlbS5uYW1lKTtcclxuXHRcdFx0XHR2YWx1ZXNbZWxlbS5uYW1lXSA/Pz0gW107XHJcblx0XHRcdFx0dmFsdWVzW2VsZW0ubmFtZV0ucHVzaChlbGVtLnZhbHVlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAobGV0IG5hbWUgaW4gdmFsdWVzKSB7XHJcblx0XHRcdGZvcm1EYXRhLnNldChuYW1lLnN1YnN0cmluZygwLCBuYW1lLmxlbmd0aCAtIDIpLCB2YWx1ZXNbbmFtZV0uam9pbignLCcpKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHJcblx0LyoqXHJcblx0ICogU2V0dXAgaGFuZGxlcnMuXHJcblx0ICogQHBhcmFtIHtIVE1MRm9ybUVsZW1lbnR9IGZvcm1cclxuXHQgKi9cclxuXHROZXR0ZS5pbml0Rm9ybSA9IGZ1bmN0aW9uIChmb3JtKSB7XHJcblx0XHRpZiAoZm9ybS5tZXRob2QgPT09ICdnZXQnICYmIGZvcm0uaGFzQXR0cmlidXRlKCdkYXRhLW5ldHRlLWNvbXBhY3QnKSkge1xyXG5cdFx0XHRmb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ2Zvcm1kYXRhJywgKGUpID0+IE5ldHRlLmNvbXBhY3RDaGVja2JveGVzKGZvcm0sIGUuZm9ybURhdGEpKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoIUFycmF5LmZyb20oZm9ybS5lbGVtZW50cykuc29tZSgoZWxlbSkgPT4gZWxlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtbmV0dGUtcnVsZXMnKSkpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdE5ldHRlLnRvZ2dsZUZvcm0oZm9ybSk7XHJcblxyXG5cdFx0aWYgKGZvcm0ubm9WYWxpZGF0ZSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHRmb3JtLm5vVmFsaWRhdGUgPSB0cnVlO1xyXG5cclxuXHRcdGZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgKGUpID0+IHtcclxuXHRcdFx0aWYgKCFOZXR0ZS52YWxpZGF0ZUZvcm0oZm9ybSkpIHtcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Zm9ybS5hZGRFdmVudExpc3RlbmVyKCdyZXNldCcsICgpID0+IHtcclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiBOZXR0ZS50b2dnbGVGb3JtKGZvcm0pKTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cclxuXHQvKipcclxuXHQgKiBAcHJpdmF0ZVxyXG5cdCAqL1xyXG5cdE5ldHRlLmluaXRPbkxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHROZXR0ZS5vbkRvY3VtZW50UmVhZHkoKCkgPT4ge1xyXG5cdFx0XHRBcnJheS5mcm9tKGRvY3VtZW50LmZvcm1zKVxyXG5cdFx0XHRcdC5mb3JFYWNoKChmb3JtKSA9PiBOZXR0ZS5pbml0Rm9ybShmb3JtKSk7XHJcblxyXG5cdFx0XHRkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcclxuXHRcdFx0XHRsZXQgdGFyZ2V0ID0gZS50YXJnZXQ7XHJcblx0XHRcdFx0d2hpbGUgKHRhcmdldCkge1xyXG5cdFx0XHRcdFx0aWYgKHRhcmdldC5mb3JtICYmIHRhcmdldC50eXBlIGluIHtzdWJtaXQ6IDEsIGltYWdlOiAxfSkge1xyXG5cdFx0XHRcdFx0XHR0YXJnZXQuZm9ybVsnbmV0dGUtc3VibWl0dGVkQnknXSA9IHRhcmdldDtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblxyXG5cdC8qKlxyXG5cdCAqIENvbnZlcnRzIHN0cmluZyB0byB3ZWIgc2FmZSBjaGFyYWN0ZXJzIFthLXowLTktXSB0ZXh0LlxyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzXHJcblx0ICogQHJldHVybiB7c3RyaW5nfVxyXG5cdCAqL1xyXG5cdE5ldHRlLndlYmFsaXplID0gZnVuY3Rpb24gKHMpIHtcclxuXHRcdHMgPSBzLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRsZXQgcmVzID0gJycsIGNoO1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNoID0gTmV0dGUud2ViYWxpemVUYWJsZVtzLmNoYXJBdChpKV07XHJcblx0XHRcdHJlcyArPSBjaCA/IGNoIDogcy5jaGFyQXQoaSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcmVzLnJlcGxhY2UoL1teYS16MC05XSsvZywgJy0nKS5yZXBsYWNlKC9eLXwtJC9nLCAnJyk7XHJcblx0fTtcclxuXHJcblx0TmV0dGUud2ViYWxpemVUYWJsZSA9IHtcXHUwMGUxOiAnYScsIFxcdTAwZTQ6ICdhJywgXFx1MDEwZDogJ2MnLCBcXHUwMTBmOiAnZCcsIFxcdTAwZTk6ICdlJywgXFx1MDExYjogJ2UnLCBcXHUwMGVkOiAnaScsIFxcdTAxM2U6ICdsJywgXFx1MDE0ODogJ24nLCBcXHUwMGYzOiAnbycsIFxcdTAwZjQ6ICdvJywgXFx1MDE1OTogJ3InLCBcXHUwMTYxOiAncycsIFxcdTAxNjU6ICd0JywgXFx1MDBmYTogJ3UnLCBcXHUwMTZmOiAndScsIFxcdTAwZmQ6ICd5JywgXFx1MDE3ZTogJ3onfTtcclxuXHJcblx0cmV0dXJuIE5ldHRlO1xyXG59KSk7XHJcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJpbXBvcnQgbmFqYSBmcm9tICduYWphJztcbmltcG9ydCBuZXR0ZUZvcm1zIGZyb20gJ25ldHRlLWZvcm1zJztcblxud2luZG93Lk5ldHRlID0gbmV0dGVGb3JtcztcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIG5hamEuaW5pdGlhbGl6ZS5iaW5kKG5hamEpKTtcbm5ldHRlRm9ybXMuaW5pdE9uTG9hZCgpOyJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==