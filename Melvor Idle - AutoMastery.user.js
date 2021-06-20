// ==UserScript==
// @name        Melvor Idle - AutoMastery
// @description Automatically spends mastery when a pool is about to fill up
// @version     3.0
// @namespace   Visua
// @match       https://melvoridle.com/*
// @match       https://www.melvoridle.com/*
// @grant       none
// ==/UserScript==
/* jshint esversion: 6 */

((main) => {
    var script = document.createElement('script');
    script.textContent = `try { (${main})(); } catch (e) { console.log(e); }`;
    document.body.appendChild(script).parentNode.removeChild(script);
})(() => {
    'use strict';

    function autoSpendMasteryPool(skill, xpToBeAdded) {
        const poolXp = MASTERY[skill].pool;
        const poolMax = getMasteryPoolTotalXP(skill);
        if (poolXp + xpToBeAdded >= poolMax * AUTOMASTERY.settings[skill].spendWhenPoolReaches / 100) {
            const _masteryPoolLevelUp = masteryPoolLevelUp;
            masteryPoolLevelUp = 1;

            const xpOverCheckpoint = (poolXp + xpToBeAdded) - (poolMax * AUTOMASTERY.settings[skill].threshold / 100);

            let masteryToLevel = -1;
            let reason = '';
            let masteries = [];

            // Only look at selected non-maxed masteries
            masteries = AUTOMASTERY.settings[skill].selectedMasteries.map(id => ({ id, xp: MASTERY[skill].xp[id] })).filter(m => m.xp < 13034432);
            if (!masteries.length) {
                // If no (non-maxed) masteries selected look at all masteries
                masteries = MASTERY[skill].xp.map((xp, id) => ({ id, xp }));
            }

            if (masteryToLevel === -1) {
                // Find the lowest or highest (depending on setting) mastery that can be afforded
                masteryToLevel = masteries
                    .reduce(
                        (best, m) => {
                            const toNext = getMasteryXpForNextLevel(skill, m.id);
                            if (toNext > 0 && toNext <= xpOverCheckpoint && (best.id === -1 || (AUTOMASTERY.settings[skill].selectLowest ? m.xp <= best.xp : m.xp >= best.xp))) {
                                return m;
                            } else {
                                return best;
                            }
                        },
                        { id: -1, xp: 0 }
                    ).id;
                reason = `was the ${AUTOMASTERY.settings[skill].selectLowest ? 'lowest' : 'highest'} that could be leveled without dropping below ${AUTOMASTERY.settings[skill].threshold}%`;
            }

            if (masteryToLevel === -1) {
                // Find the cheapest mastery since we can't afford any
                const min = masteries
                    .map(m => ({ id: m.id, toNext: getMasteryXpForNextLevel(skill, m.id) }))
                    .reduce((min, m) => ((m.toNext > 0 && m.toNext <= min.toNext) || min.toNext === 0 ? m : min));
                if (min.toNext > 0 && min.toNext < poolXp) {
                    masteryToLevel = min.id;
                    reason = `was the cheapest to level and we are forced to drop below ${AUTOMASTERY.settings[skill].threshold}%`;
                }
            }

            if (masteryToLevel !== -1) {
                const message = `AutoMastery: Leveled up ${getMasteryName(skill, masteryToLevel)} to ${getMasteryLevel(skill, masteryToLevel) + 1}`;
                const cost = getMasteryXpForNextLevel(skill, masteryToLevel);
                const details = `Earned ${numberWithCommas(xpToBeAdded.toFixed(3))} XP. `
                    + `Pool before: ${((poolXp / poolMax) * 100).toFixed(3)}%. `
                    + `Pool after: ${(((poolXp + xpToBeAdded - cost) / poolMax) * 100).toFixed(3)}%`;
                console.log(`${message} for ${numberWithCommas(Math.round(cost))} XP because it ${reason} (${details})`);
                autoMasteryNotify(message);
                const _showSpendMasteryXP = showSpendMasteryXP;
                showSpendMasteryXP = () => {};
                try {
                    levelUpMasteryWithPool(skill, masteryToLevel);
                } catch (e) {
                    console.error(e);
                } finally {
                    masteryPoolLevelUp = _masteryPoolLevelUp;
                    showSpendMasteryXP = _showSpendMasteryXP;
                }
                autoSpendMasteryPool(skill, xpToBeAdded);
            }
        }
    }

    function autoMasteryNotify(message) {
        Toastify({
            text: `<div class="text-center"><img class="notification-img" src="assets/media/main/mastery_pool.svg"><span class="badge badge-success">${message}</span></div>`,
            duration: 5000,
            gravity: 'bottom',
            position: 'center',
            backgroundColor: 'transparent',
            stopOnFocus: false,
        }).showToast();
    }

    function autoMastery() {
        // Load settings
        const settings = Object.keys(SKILLS).map(s => ({ threshold: 95, spendWhenPoolReaches: 100, selectLowest: true, selectedMasteries: [] }));
        const savedSettings = JSON.parse(localStorage.getItem(`AutoMastery-${currentCharacter}`));
        if (savedSettings) {
            settings.splice(0, savedSettings.length, ...savedSettings);
        }

        // Validate and save settings on change
        const settingsHandler = {
            set: function (obj, prop, value) {
                if (prop === 'threshold') {
                    if (!Number.isInteger(value)) {
                        throw new TypeError('threshold should be an integer');
                    }
                    if (value < 0 || value > 95) {
                        throw new RangeError('threshold should be a number from 0 to 95');
                    }
                } else if (prop === 'spendWhenPoolReaches') {
                    if (!Number.isInteger(value)) {
                        throw new TypeError('spendWhenPoolReaches should be an integer');
                    }
                    if (value < 0 || value > 100) {
                        throw new RangeError('spendWhenPoolReaches should be a number from 0 to 100');
                    }
                } else if (prop === 'selectLowest') {
                    if (typeof value !== 'boolean') {
                        throw new TypeError('selectLowest should be a boolean');
                    }
                } else if (prop === 'selectedMasteries') {
                    if (!Array.isArray(value) || value.some(e => !Number.isInteger(e))) {
                        throw new TypeError('selectedMasteries should be an array of integers');
                    }
                }

                obj[prop] = value;
                localStorage.setItem(`AutoMastery-${currentCharacter}`, JSON.stringify(AUTOMASTERY.settings));
                console.log('Settings saved');
                return true;
            },
        };

        window.AUTOMASTERY = {
            settings: settings.map(skillSettings => new Proxy(skillSettings, settingsHandler)),
        };

        // Inject
        const _addMasteryXPToPool = addMasteryXPToPool;
        addMasteryXPToPool = (...args) => {
            try {
                const skill = args[0];
                let xpToBeAdded = args[1];
                const token = args[3];
                if (xpToBeAdded > 0) {
                    if (skillLevel[skill] >= 99 && !token) {
                        xpToBeAdded /= 2;
                    } else if (!token) {
                        xpToBeAdded /= 4;
                    }
                    autoSpendMasteryPool(skill, xpToBeAdded);
                }
            } catch (e) {
                console.error(e);
            } finally {
                _addMasteryXPToPool(...args);
            }
        };
    }

    function loadScript() {
        if (typeof confirmedLoaded !== 'undefined' && confirmedLoaded && !currentlyCatchingUp) {
            clearInterval(interval);
            console.log('Loading AutoMastery');
            autoMastery();
        }
    }

    const interval = setInterval(loadScript, 500);
});
