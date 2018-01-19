/**
 * Utility functions.
 */

/* global window, document, pym, _, $ */
'use strict';

// Dependencies
import queryString from 'query-string';

// Util class
class Util {
  /**
   * Constructor
   * @param  {object} options Object with the following keys:
   *                          - pym: Enable pym.js, defaults to true
   *                          - views: Object describing views
   *                          - useView: Boolean whether to show view, defaults
   *                            to true.
   * @return {undefined}
   */
  constructor(options) {
    this.options = options || {};

    // Defaults
    this.options.pym = this.options.pym === undefined ? true : this.options.pym;
    this.options.runChecks =
      this.options.runChecks === undefined ? true : this.options.runChecks;
    this.options.useView =
      this.options.useView === undefined ? true : this.options.useView;
    this.options.views = this.options.views || {
      develop: /localhost.*|127\.0\.0\.1.*/i,
      staging: /staging/i
    };

    // Read in query params
    this.parseQuery();

    // Set the view
    this.setView();

    // Enable pym
    if (this.options.pym) {
      this.pym = !_.isUndefined(window.pym)
        ? new pym.Child({ polling: 500 })
        : undefined;
    }

    // Run checks
    if (this.options.runChecks) {
      this.checkGeolocate();
      this.checkLocalStorage();
    }

    // Polyfill object-fit if available
    if (window.objectFitImages) {
      window.objectFitImages();
    }

    // Attach for ease of use
    this.queryString = queryString;

    // Do this up front since it can be an async test
    this.checkGeolocate();
  }

  // Set view (make note)
  setView() {
    if (this.options.useView) {
      let view;
      _.find(this.options.views, (match, v) => {
        view = v;
        return window.location.href.match(match) ? v : undefined;
      });

      if (view) {
        let div = document.createElement('div');
        let body = document.getElementsByTagName('body')[0];
        div.className = 'site-view site-view-' + view;
        body.insertBefore(div, body.childNodes[0]);
      }
    }
  }

  // Get query params and adjust as needed
  parseQuery() {
    this.query = queryString.parse(document.location.search);

    // Adjust options
    if (this.query.pym && this.query.pym === 'true') {
      this.options.pym = true;
    }
  }

  // Super basic deep clone
  deepClone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  // Simple check to see if embedded in iframe
  isEmbedded() {
    if (!_.isUndefined(this.embedded)) {
      return this.embedded;
    }

    try {
      this.embedded = window.self !== window.top;
    }
    catch (e) {
      this.embedded = true;
    }

    return this.embedded;
  }

  // Check for local storage
  checkLocalStorage() {
    if (!_.isUndefined(this.hasLocalStorage)) {
      return this.hasLocalStorage;
    }

    try {
      window.localStorage.setItem('test', 'test');
      window.localStorage.removeItem('test');
      this.hasLocalStorage = true;
    }
    catch (e) {
      this.hasLocalStorage = false;
    }

    return this.hasLocalStorage;
  }

  // Check for geolocation
  checkGeolocate() {
    if (_.isUndefined(this.hasGeolocate)) {
      this.hasGeolocate = window.navigator && 'geolocation' in window.navigator;
      // Unfortunately HTTPS is needed, but in some browsers,
      // the API is still available.  We could run the API, but then the user
      // gets a dialog.  :(
    }

    return this.hasGeolocate;
  }

  // Basic geolocation function
  geolocate(done, watch = false) {
    if (this.checkGeolocate()) {
      this.geolocateWatchID = window.navigator.geolocation[
        watch ? 'watchPosition' : 'getCurrentPosition'
      ](
        position => {
          done(null, {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        error => {
          this.hasGeolocate = false;
          done(error ? error : 'Unable to find your position.');
        }
      );
    }
    else {
      done('Geolocation not available');
    }
  }

  // Stop geolocation
  stopGeolocate() {
    if (this.geolocateWatchID && this.checkGeolocate()) {
      window.navigator.geolocation.clearWatch(this.geolocateWatchID);
    }
  }

  // Scroll to id
  // Note scrollIntoView is a native API but it is
  // not widely supported and not good polyfills exists,
  // specifically ones that can offset.
  goTo(id, parent, scrollToOptions = {}) {
    const el = _.isElement(id)
      ? id
      : id[0] && _.isElement(id[0]) ? id[0] : document.getElementById(id);
    let $parent = _.isUndefined(parent) ? $(window) : $(parent);
    scrollToOptions.duration = scrollToOptions.duration || 1250;

    if (!el) {
      return;
    }

    if (this.isEmbedded() && this.pym) {
      this.pym.scrollParentToChildEl(el);
    }
    else {
      $parent.scrollTo($(el), scrollToOptions);
    }
  }

  // Round number
  round(value, decimals = 2) {
    return _.isNumber(value)
      ? Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
      : value;
  }

  // Test for ios
  checkAndroid() {
    if (!_.isBoolean(this.isAndroid)) {
      this.isAndroid =
        window.navigator &&
        window.navigator.userAgent &&
        window.navigator.userAgent.match(/android/i);
    }

    return this.isAndroid;
  }

  // Test for ios
  checkIOS() {
    if (!_.isBoolean(this.isIOS)) {
      this.isIOS =
        window.navigator &&
        window.navigator.userAgent &&
        window.navigator.userAgent.match(/iphone|ipad/i);
    }

    return this.isIOS;
  }

  // Test for windows phone
  checkWindowsPhone() {
    if (!_.isBoolean(this.isWindowsPhone)) {
      this.isWindowsPhone =
        window.navigator &&
        window.navigator.userAgent &&
        window.navigator.userAgent.match(/windows\sphone/i);
    }

    return this.isWindowsPhone;
  }

  // Check basic mobile (assume ios or android)
  checkMobile() {
    return this.checkAndroid() && this.checkIOS() && this.checkWindowsPhone();
  }
}

// Export a generator for the class.
export default options => {
  return new Util(options);
};
