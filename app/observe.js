/**
 * Handle interaction observing, specifically, given a list of items,
 * finding the top one
 */

/* global window, document, _ */
'use strict';

class Observer {
  constructor(options = {}) {
    // ACtually throttling is bad because we can miss when something gets
    // to a relevant place
    options.throttle =
      options.throttle === false || options.throttle ? options.throttle : 150;
    options.attribute = options.attribute || 'data-id';
    options.visibleThreshold = options.visibleThreshold || 0.85;
    options.onObserve = options.onObserve || function() {};
    options.root = options.root || document.querySelector('document');
    options.forceItem =
      options.forceItem === false || options.forceItem
        ? options.forceItem
        : false;
    this.options = options;

    // Don't do anything if not in browser
    if (!window || !window.IntersectionObserver) {
      return;
    }

    // Make observer
    this.observer = new IntersectionObserver(
      this.options.throttle
        ? _.throttle(_.bind(this.onObserve, this), this.options.throttle)
        : _.bind(this.onObserve, this),
      {
        root: _.isElement(this.options.root)
          ? this.options.root
          : document.querySelector(this.options.root),
        threshold: _.map(_.range(0, 50), i => i * 2 / 100)
      }
    );

    // Add elements
    if (this.options.elements) {
      this.addElements(this.options.elements);
    }
  }

  addElements(elements) {
    if (_.isArrayLike(elements)) {
      if (_.isArrayLike(this.options.elements)) {
        this.options.elements = _.map(this.options.elements);
        this.options.elements.concat(elements);
      }
      else {
        this.options.elements = elements;
      }

      elements.forEach(e => {
        this.observer.observe(e);
      });
    }
    else if (_.isElement(elements)) {
      if (_.isArrayLike(this.options.elements)) {
        this.options.elements.push(elements);
      }
      else {
        this.options.elements = [elements];
      }

      this.observer.observe(elements);
    }
  }

  onObserve(entries) {
    // We only want to highlight one element at a time, so
    // order by the top and which one is most in view.
    let sorted = _.orderBy(
      entries,
      ['intersectionRatio', e => e.boundingClientRect.y],
      ['desc', 'asc']
    );
    if (
      sorted[0].intersectionRatio >= this.options.visibleThreshold ||
      this.options.forceItem
    ) {
      sorted[0].inView = true;
    }

    this.options.onObserve(
      sorted[0].inView
        ? sorted[0].target.getAttribute(this.options.attribute)
        : undefined,
      sorted[0].inView ? sorted[0] : undefined,
      sorted
    );
  }

  // Stop (disconnect) all items
  stop() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Export a generator for the class.
module.exports = options => {
  return new Observer(options);
};
