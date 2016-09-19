var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var child_process = require('child_process');
var rename = require('gulp-rename');
var sh = require('shelljs');

var paths = {
  sass: ['./scss/**/*.scss']
};

gulp.task('default', ['sass']);

gulp.task('serve:before', ['watch']);
gulp.task('serve', function(done) {
  spawn('ionic', ['serve', '-c'], done)
})


gulp.task('build-ios', ['sass', 'trim'], done => {
  spawn('ionic', ['build', 'ios'], done)
})

gulp.task('xcode', ['build-ios', 'trim'], function(done) {
  spawn('open', ['platforms/ios/crionic-tabs.xcodeproj'], done)
})

// This is not great. A better thing would be to actually move the wanted code somewhere else like www/reallib and then
// exclude www/lib from shipping in the mobile app package; i.e. whitelist what we want, don't just blacklist stuff.
// However, that will take more time; but www/lib is currently 14MB which is too much.
gulp.task('trim', done => {
  var remove = ['angular*'
    , 'ionic/css', 'ionic/js/ionic-angular*', 'ionic/js/{ionic,ionic.min,ionic.bundle}.js'
    , 'pouchdb/lib'
    , 'pouchdb/dist/pouchdb{-next,.fruitdown,.fruitdown.min,,.localstorage,.localstorage.min,.memory,.memory.min}.js'
    ]
  rm()
  function rm() {
    var target = remove.shift()
    if (! target)
      return done()

    spawn('rm', ['-rf', '-v', './www/lib/'+target], {shell:true}, code => {
      rm()
    })
  }
})

gulp.task('sass', function(done) {
  gulp.src('./scss/ionic.app.scss')
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});

//
// Miscellaneous
//

function spawn(cmd, args, opts, callback) {
  if (typeof args == 'function') {
    callback = args
    args = []
    opts = {}
  } else if (typeof opts == 'function') {
    callback = opts
    opts = {}
  }

  gutil.log('Spawn', gutil.colors.cyan(cmd), gutil.colors.yellow(args.map(JSON.stringify).join(', ')))
  var child = child_process.spawn(cmd, args, opts)
  child.on('error', er => { throw er })
  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)
  process.stdin.pipe(child.stdin)

  child.on('close', code => {
    //console.log('%s %s -> %s', cmd, args.join(', '), code)
    callback(code)
  })

  return child
}
