/**
 * Task running and building through Gulp.
 * http://gulpjs.com/
 *
 * Overall, use config files (like .babelrc) to manage
 * options for processes.  This will allow moving away from
 * Gulp more easily if desired.
 */
'use strict';

// Dependencies
const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const _ = require('lodash');
const rename = require('gulp-rename');
const eslint = require('gulp-eslint');
const stylelint = require('gulp-stylelint');
const sass = require('gulp-sass');
const htmlhint = require('gulp-htmlhint');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const a11y = require('gulp-a11y');
const responsive = require('gulp-responsive');
const ejs = require('gulp-ejs');
const gutil = require('gulp-util');
const runSequence = require('run-sequence');
const browserSync = require('browser-sync').create();
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const argv = require('yargs').argv;
const webpackConfig = require('./webpack.config.js');
const del = require('del');
const swprecache = require('sw-precache');
const gulpContent = require('./lib/gulp-content.js');
const gulpPublish = require('./lib/gulp-publish.js');
const jest = require('./lib/gulp-jest.js');
const layouts = require('./lib/gulp-layouts.js');
const airtable = require('./lib/gulp-airtable.js');
const responsiveConfig = require('./lib/gulp-responsive.js');
const config = exists('config.custom.json')
  ? require('./config.custom.json')
  : require('./config.json');

require('dotenv').load({ silent: true });

// Process laytouts/templates.  Components get rendered server-side
// for better performance and SEO
gulp.task(
  'html',
  layouts(gulp, {
    data: 'sources/guide-data.json',
    airtableContent: 'sources/guide-settings.json',
    //content: 'content.json',
    config: 'config.json',
    package: 'package.json'
  })
);

// Get guide data from Airtable
gulp.task(
  'source:content',
  airtable(gulp, {
    base: 'appdVGBfh1z13BSwv',
    apiKey: process.env.AIRTABLE_API_KEY,
    tables: ['Groups', 'Lists', 'Items'],
    images: ['lists.mainImage', 'items.mainImage'],
    imagePath: 'assets/images/airtable',
    markdown: ['lists.byline', 'lists.description', 'items.description'],
    outputPath: 'sources/guide-data.json'
  })
);
gulp.task(
  'source:settings',
  airtable(gulp, {
    base: 'appdVGBfh1z13BSwv',
    apiKey: process.env.AIRTABLE_API_KEY,
    tables: ['Settings'],
    outputPath: 'sources/guide-settings.json'
  })
);
gulp.task('source:data', ['source:content', 'source:settings']);

// Lint HTML (happens after HTML build process).  The "stylish" version
// is more succinct but its less helpful to find issues.
gulp.task('html:lint', ['html'], () => {
  return gulp
    .src('build/*.html')
    .pipe(htmlhint('.htmlhintrc'))
    .pipe(htmlhint.reporter('htmlhint-stylish'))
    .pipe(a11y())
    .pipe(a11y.reporter());
});
gulp.task('html:lint:details', ['html'], () => {
  return gulp
    .src('build/*.html')
    .pipe(htmlhint('.htmlhintrc'))
    .pipe(htmlhint.reporter())
    .pipe(a11y())
    .pipe(a11y.reporter());
});

// Wrapper for data and html
gulp.task('html:data', done => {
  runSequence('source:data', 'html:lint:details', done);
});
// Wrapper for data, images, and html
gulp.task('html:full', done => {
  runSequence('source:data', 'assets:responsive', 'html:lint:details', done);
});

// Content tasks
gulp.task('content', gulpContent.getContent(gulp, config));
gulp.task('content:create', gulpContent.createSheet(gulp, config));
gulp.task('content:open', gulpContent.openContent(gulp, config));
gulp.task('content:owner', gulpContent.share(gulp, config, 'owner'));
gulp.task('content:share', gulpContent.share(gulp, config, 'writer'));

// Lint JS
gulp.task('js:lint', () => {
  return gulp
    .src(['app/**/*.js', 'gulpfile.js'])
    .pipe(eslint())
    .pipe(eslint.format());
});

// Lint styles/css
gulp.task('styles:lint', () => {
  return gulp.src(['styles/**/*.scss']).pipe(
    stylelint({
      failAfterError: false,
      reporters: [{ formatter: 'string', console: true }]
    })
  );
});

// Compile styles
gulp.task('styles', ['styles:lint'], () => {
  return gulp
    .src('styles/index.scss')
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        outputStyle: 'compressed',
        includePaths: [path.join(__dirname, 'node_modules')]
      }).on('error', sass.logError)
    )
    .pipe(
      autoprefixer({
        // browsers: See browserlist file
        cascade: false
      })
    )
    .pipe(
      rename(path => {
        path.basename =
          path.basename === 'index' ? 'styles.bundle' : path.basename;
      })
    )
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('build/'));
});

// Build JS
gulp.task('js', ['js:lint', 'js:test'], () => {
  // Use the webpack.config.js to manage locations and options.
  return gulp
    .src('app/index.js')
    .pipe(webpackStream(webpackConfig, webpack))
    .pipe(gulp.dest('build'));
});

// Assets
gulp.task('assets', () => {
  let pkg = require('./package.json');
  let settings = exists('sources/guide-settings.json')
    ? require('./sources/guide-settings.json')
    : {};
  let config = exists('config.custom.json')
    ? require('./config.custom.json')
    : require('./config.json');
  config = _.extend(config, layouts.parseAirtableContent(settings));

  // Copy a couple files to root for more global support
  gulp.src(['./assets/images/favicons/favicon.ico']).pipe(gulp.dest('build'));
  gulp
    .src(['./assets/images/favicons/manifest.json'])
    .pipe(
      ejs({
        content: config,
        pkg: pkg
      })
    )
    .pipe(gulp.dest('build'));

  return gulp.src('assets/**/*').pipe(gulp.dest('build/assets'));
});

// Responsive images.  This is an expensive task.
gulp.task('assets:responsive:airtable', () => {
  return gulp
    .src(['assets/images/airtable/**/*.{jpg,png}'])
    .pipe(
      responsive(
        responsiveConfig(responsive).sizes,
        responsiveConfig(responsive).options
      )
    )
    .pipe(gulp.dest('build/assets/images/airtable'));
});
gulp.task('assets:responsive:images', () => {
  return gulp
    .src(['assets/images/responsive/**/*.{jpg,png}'])
    .pipe(
      responsive(
        responsiveConfig(responsive).sizes,
        responsiveConfig(responsive).options
      )
    )
    .pipe(gulp.dest('build/assets/images'));
});
gulp.task('assets:responsive', [
  'assets:responsive:images',
  'assets:responsive:airtable'
]);

// Clean build
gulp.task('clean', () => {
  return del(['build/**/*']);
});

// Testing, manully using jest module because
gulp.task(
  'js:test',
  jest('js:test', {
    rootDir: __dirname,
    testMatch: ['**/*.test.js'],
    testPathIgnorePatterns: ['acceptance'],
    setupFiles: ['./tests/globals.js']
  })
);
gulp.task(
  'js:test:acceptance',
  jest('js:test:acceptance', {
    rootDir: __dirname,
    // Not sure why full path is needed
    testMatch: [path.join(__dirname, 'tests/acceptance/*.test.js')]
  })
);

// Web server for development.  Do build first to ensure something is there.
gulp.task('server', ['build'], () => {
  return browserSync.init({
    port: 3000,
    server: './build/',
    files: './build/**/*',
    https: argv.https
  });
});

// Watch for building
gulp.task('watch', () => {
  gulp.watch(['styles/**/*.scss'], ['styles', 'sw:precache']);
  gulp.watch(
    [
      'templates/**/*',
      'sources/**/*.json',
      'config.*json',
      'package.json',
      'content.json',
      'app/svelte-components/**/*'
    ],
    ['html', 'sw:precache']
  );
  gulp.watch(['app/**/*', 'config.json'], ['js', 'sw:precache']);
  gulp.watch(['assets/**/*'], ['assets']);
  gulp.watch(['config.*json'], ['publish:build-config']);
});

// Make precache service worker file
gulp.task('sw:precache', done => {
  let location = 'build';

  let config = {
    cacheId: require('./package.json').name,
    // False for dev so that caching wont get in the way,
    // but this means that Chrome/Android won't think
    // the site has offline capabilities, FYI
    handleFetch: argv.deploying || argv.production ? true : false,
    logger: gutil.log,
    // Note that sw-precache will use cache version, unless specified
    // here.  But, each time this is run, hashes are created, so,
    // not sure if this is really necessary
    runtimeCaching: [
      {
        urlPattern: /.*/,
        handler: 'networkFirst'
      }
    ],
    staticFileGlobs: [
      location + '/**/*.{js,json,html,css,svg}',
      location + '/assets/images/favicons/**/*',
      location + '/assets/images/icons/**/*',
      location + '/assets/images/airtable/**/*-600*jpg',
      location + '/responsive/**/*-600*jpg'
    ],
    stripPrefix: location + '/'
    //verbose: true
  };

  swprecache.write(
    path.join(__dirname, location, 'sw-precache-service-worker.js'),
    config,
    done
  );
});

// Publishing
gulp.task(
  'publish',
  ['publish:token', 'publish:confirm'],
  gulpPublish.publish(gulp)
);
gulp.task('publish:token', gulpPublish.createToken(gulp));
gulp.task('publish:build-config', gulpPublish.buildConfig(gulp));
gulp.task('publish:confirm', gulpPublish.confirmToken(gulp));
gulp.task('publish:open', gulpPublish.openURL(gulp));

// Short build and full build
gulp.task('build', done => {
  runSequence(['assets', 'html:data', 'styles', 'js'], 'sw:precache', done);
});
gulp.task('build:full', done => {
  runSequence(['assets', 'html:full', 'styles', 'js'], 'sw:precache', done);
});
gulp.task('default', ['build:full']);

// Deploy (build and publish)
gulp.task('deploy', done => {
  argv.deploying = true;
  return runSequence('clean', 'build:full', 'publish', done);
});
gulp.task('deploy:open', ['publish:open']);

// Server and watching (development)
gulp.task('develop', ['server', 'watch']);

// Check file/fir exists
function exists(file) {
  return fs.existsSync(path.join(__dirname, file));
}
