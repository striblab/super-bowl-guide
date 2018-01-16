/**
 * Main JS file for project.
 */

// Define globals that are added through the config.json file, here like this:
/* global $, _ */
'use strict';

// Dependencies
import utilsFn from './utils.js';
import iosHomescreen from './ios-homescreen.js';

// Since we can't do dynamic imports
import Header from './svelte-components/header.html';
import Groups from './svelte-components/groups.html';
import Index from './svelte-components/index.html';
import Lists from './svelte-components/lists.html';
import Items from './svelte-components/items.html';
let components = {
  Header,
  Groups,
  Index,
  Lists,
  Items
};

// Setup utils function
let utils = utilsFn({
  useView: false
});

// Object for global store across components.  In theory, the svelte
// store shoudl work, but was unable to get this to work
let store = {
  error: false,
  errorMessage: null,
  location: null,
  offline: false
};

// Create components.  Get page data.
let dataFile = $('body').attr('data-page-data');
if (dataFile) {
  window
    .fetch(dataFile)
    .then(response => response.json())
    .then(data => {
      // Make components
      $('[data-component]').each((e, el) => {
        let c = $(el).attr('data-component');
        new components[c]({
          hydrated: true,
          target: el,
          data: {
            data: data,
            content: window.__startribune
              ? window.__startribune.contentSettings
              : {},
            groups: window.__startribune ? window.__startribune.groups : {},
            utils: utils,
            store: store
          }
        });
      });

      // Precache (offline) service worker.  Do it here, so that we know
      // the base path
      if ('serviceWorker' in window.navigator) {
        window.navigator.serviceWorker.register(
          (data.basePath || '.') + '/sw-precache-service-worker.js'
        );
      }
    })
    .catch(console.error);
}

// Some general handling of spacing for fixed items
function adjustFixedElements() {
  let $header = $('.project-header');
  let $mNav = $('.minor-navigation');

  // Header
  $('.has-header').each((i, el) => {
    $(el).css('padding-top', $header.outerHeight());
  });
  $('.adjust-header').each((i, el) => {
    $(el).css('top', $header.outerHeight());
  });

  // Minor nav
  $('.has-minor-navigation').each((i, el) => {
    $(el).css('padding-top', $mNav.outerHeight());
  });
}
$(document).ready(adjustFixedElements);

// Let the app know about online or offline
if (window.navigator) {
  if (_.isBoolean(window.navigator.onLine)) {
    store.offline = !window.navigator.onLine;
    $('body').toggleClass('offline', store.offline);
  }

  window.addEventListener('load', () => {
    window.addEventListener('online', () => {
      store.offline = false;
      $('body').toggleClass('offline', store.offline);
    });
    window.addEventListener('offline', () => {
      store.offline = true;
      $('body').toggleClass('offline', store.offline);
    });
  });
}

// Handle ioshomescreen
iosHomescreen(utils);
