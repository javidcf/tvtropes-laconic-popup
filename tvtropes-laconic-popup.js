// ==UserScript==
// @name         TV Tropes laconic popup
// @namespace    https://github.com/javidcf/tvtropes-laconic-popup
// @version      1.0
// @description  Shows a popup with the laconic description of tropes in TV Tropes (when available).
// @author       Javier Dehesa
// @match        https://tvtropes.org/pmwiki/pmwiki.php/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const POPUP_WIDTH = 320;
    const POPUP_DELAY = 500;
    const POPUP_DISTANCE = 20;

    const LINK_RGX = /tvtropes.org\/pmwiki\/pmwiki\.php\/[^\/]+\/([^\/]+)$/

    var mouseX = 0;
    var mouseY = 0;
    document.addEventListener('mousemove', function (event)
    {
        mouseX = event.clientX;
        mouseY = event.clientY;
    });

    function mouseIsClose(elem, d)
    {
        if (!elem) return false;
        var rect = elem.getBoundingClientRect();
        var far = mouseX + d < rect.left || mouseX - d > rect.right || mouseY + d < rect.top || mouseY - d > rect.bottom;
        return !far;
    }

    function loadPopup(link, href)
    {
        if (link.popup != null && link.popup.parentElement != null)
        {
            link.popup.parentElement.removeChild(link.popup);
        }
        link.requesting = true;
        fetch(href)
        .then((response) =>
        {
            return link.requesting ? response.text() : null;
        })
        .then((html) =>
        {
            if (!link.requesting)
            {
                clearPopup(link);
                return;
            }
            link.requesting = false;
            //link.title = '';
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, "text/html");
            var title_text = doc.querySelector('h1.entry-title').innerText.split(' / ')[1];
            var laconic_selected = doc.querySelector('.curr-subpage * .laconic-icon')
            if (laconic_selected === null) return;
            var article = doc.querySelector('#main-article > p');
            if (article === null) return;
            var popup = link.parentLink ? link.parentLink.popup : document.createElement('div');
            if (!popup)
            {
                clearPopup(link);
                return;
            }
            while (popup.firstChild)
            {
                popup.removeChild(popup.lastChild);
            }
            var title_node = document.createElement('strong');
            title_node.appendChild(document.createTextNode(title_text));
            popup.appendChild(title_node);
            article.style.marginTop = '10px';
            popup.appendChild(article);
            if (link.parentLink)
            {
                link.parentLink.dirty = true;
            }
            else
            {
                popup.style.cssText = 'position: absolute;' +
                    'width: ' + POPUP_WIDTH + 'px;' +
                    'padding: 10px;' +
                    'border: 1px solid darkgray;' +
                    'border-radius: 10px;' +
                    'font-weight: normal;' +
                    'font-style: normal;' +
                    'font-size: 12pt;' +
                    'line-height: 18pt;' +
                    'text-align: left;' +
                    'text-decoration: none;' +
                    'z-index: ' + link.z + ' !important;';
                var mainArticle = document.getElementById('main-article');
                var rect = mainArticle.getBoundingClientRect();
                var mouseXrel = mouseX - rect.left + mainArticle.offsetLeft;
                var mouseYrel = mouseY - rect.top + mainArticle.offsetTop;
                popup.style.left = Math.max(mouseXrel - POPUP_WIDTH / 2, 0) + 'px';
                popup.style.top = (mouseYrel + POPUP_DISTANCE) + 'px';
                popup.style.backgroundColor = window.getComputedStyle(document.getElementById('main-content')).backgroundColor;
                mainArticle.insertBefore(popup, mainArticle.firstChild);
            }
            link.title = '';
            link.popup = popup;
            var newLinks = popup.getElementsByTagName('a');
            for (var i = 0; i < newLinks.length; i++)
            {
                // prepareLink(newLinks[i], link.z + 1, link);
                // Do not use parent link
                prepareLink(newLinks[i], link.z + 1, null);
            }
        })
        .catch((error) => { clearPopup(link); console.error(error); });
    };

    function onHover(link, href)
    {
        if (!link.active) return;
        var isClose = link.hovering || mouseIsClose(link.popup, POPUP_DISTANCE);
        if (isClose)
        {
            if (link.hovering && (!link.loaded || link.dirty))
            {
                link.loaded = true;
                link.dirty = false;
                loadPopup(link, href);
            }
            if (!link.parentLink)
            {
                window.setTimeout(onHover, POPUP_DELAY, link, href);
            }
        }
        else if (!link.parentLink)
        {
            clearPopup(link);
        }
    }

    function makeOnMouseEnterCallback(link, href)
    {
        return function()
        {
            var started = link.hovering || link.active;
            link.hovering = true;
            link.active = true;
            if (!started) window.setTimeout(onHover, POPUP_DELAY, link, href);
        };
    }

    function makeOnMouseOutCallback(link)
    {
        return function()
        {
            link.hovering = false;
        };
    }

    function prepareLink(link, z, parentLink)
    {
        var match = link.href.match(LINK_RGX);
        if (match === null) return;
        var href_laconic = 'https://tvtropes.org/pmwiki/pmwiki.php/Laconic/' + match[1];
        link.origTitle = link.title;
        link.popup = null;
        link.requesting = false;
        link.loaded = false;
        link.active = false;
        link.hovering = false;
        link.dirty = false;
        link.onmouseenter = makeOnMouseEnterCallback(link, href_laconic);
        link.onmouseout = makeOnMouseOutCallback(link);
        link.z = z;
        link.parentLink = parentLink;
    }

    function clearPopup(link)
    {
        if (link.popup != null && link.popup.parentElement != null)
        {
            link.popup.parentElement.removeChild(link.popup);
        }
        link.popup = null;
        link.requesting = false;
        link.loaded = false;
        link.active = false;
        link.hovering = false;
        link.dirty = false;
        link.title = link.origTitle;
    }
    var links = document.querySelectorAll('#main-article * a');
    for (var i = 0; i < links.length; i++)
    {
        prepareLink(links[i], 100, null);
    }
})();
