// ==UserScript==
// @name        Melvor Idle - XP Tracker
// @description Automatically collects loot
// @version     1.0
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
            if (droppedLoot.length) {
                lootAll();
            }
        }, 5000);
    }

    function loadScript() {
        if (typeof confirmedLoaded !== 'undefined' && confirmedLoaded && !currentlyCatchingUp) {
            clearInterval(interval);
            console.log('Loading AutoLoot');
            autoLoot();
        }
    }

    const interval = setInterval(loadScript, 1000);
});
