// ==UserScript==
// @name        Melvor Idle - AutoLoot
// @description Automatically collects loot
// @version     1.1
// @namespace   Visua
// @match       https://*.melvoridle.com/*
// @exclude     https://wiki.melvoridle.com*
// @noframes
// @grant       none
// ==/UserScript==
/* jshint esversion: 6 */

((main) => {
    var script = document.createElement('script');
    script.textContent = `try { (${main})(); } catch (e) { console.log(e); }`;
    document.body.appendChild(script).parentNode.removeChild(script);
})(() => {
    'use strict';

    function autoLoot() {
        setInterval(() => {
            if (player.manager.loot.drops.length) {
                player.manager.loot.lootAll();
            }
        }, 5000);
    }

    function loadScript() {
        if (typeof confirmedLoaded !== 'undefined' && confirmedLoaded) {
            clearInterval(interval);
            console.log('Loading AutoLoot');
            autoLoot();
        }
    }

    const interval = setInterval(loadScript, 1000);
});
