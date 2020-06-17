var gulp = require('gulp');
const $ = require('gulp-load-plugins')();
var autoprefixer = require('autoprefixer');
var browserSync = require('browser-sync').create();
// 圖片壓縮優化
var mozjpeg = require('imagemin-mozjpeg');
var optipng = require('imagemin-optipng');
var imageminSvgo = require('imagemin-svgo');
// /圖片壓縮優化

var { options } = require('./options');
var { vendorJs } = require('./vendor.js');
console.log(vendorJs);

console.log(options);
// production || develop
// # gulp --env production

gulp.task('iconfont', function () {
  return gulp
    .src('./node_modules/material-design-icons/iconfont/**')
    .pipe(gulp.dest('./output/assets/iconfont'))
});

gulp.task('jade', function() {
  return gulp
    .src('./source/jade/**/!(_)*.jade') // "!(_)" 檔名前加 "_" 下底線時，檔案不處理 (多半為連結檔)
    .pipe($.plumber())
    // .pipe($.data( function () {
    //   var menuData = require("../source/data/menuData.json")
    //   var productData = require("../source/data/productData.json")
    //   var source = {
    //     'menuData': menuData,
    //     'productData': productData
    //   };
    //   console.log('source', source);
    //   return source;
    // }))
    .pipe($.jade({
      pretty : true // false 會壓成單行
    }))
    .pipe(gulp.dest('./output/'))
    .pipe(browserSync.stream())
});

gulp.task('sass', function () {
  var plugins = [
    autoprefixer({
      // 原本 Autoprefixer 設置因新版將 browsers 改成 Browserslist
      // browsers: ['last 3 version', '> 5%']
      Browserslist: ['last 3 version', '> 5%']
    })
  ];
  return gulp
    .src('./source/assets/scss/**/*.scss')
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      outputStyle: 'expanded', // expanded & nested
    }).on('error', $.sass.logError))
    // css 已編譯完成
    .pipe($.postcss(plugins))
    .pipe($.if(options.env === 'production', $.cssnano()))
    .pipe($.if(options.env !== 'production', $.sourcemaps.write('.')))
    .pipe(gulp.dest('./output/assets/css'))
    .pipe(
      browserSync.reload({
        stream: true
      })
    );
});

gulp.task('babel', function() {
  return gulp
    .src('./source/assets/js/**/*.js')
    .pipe($.sourcemaps.init())
    .pipe($.babel({
      presets: ['@babel/env']
    }))
    .pipe($.concat('all.js'))
    .pipe(
      $.if(options.env === 'production', $.uglify({
          compress: { drop_console: true }
        })
      )
    )
    //判斷執行環境不是 production 會加上 sourcemap 給 JS 除錯，只針對自定部份，vendor 相關引入不使用
    .pipe($.if(options.env !== 'production', $.sourcemaps.write('.'))) 
    .pipe(gulp.dest('./output/assets/js'))
    .pipe(browserSync.stream())
});


gulp.task('clean', function () {
  return gulp
    .src(['./.tmp', './output'], {read: false, allowEmpty: true})
    .pipe($.clean());
});

gulp.task("imageMin", function(){
  return gulp
    .src("./source/assets/img/**")
    .pipe($.if(options.env === "production", $.imagemin(
      /** Gulp 圖片格式設定文件
        ** 設定資料來源: https://awdr74100.github.io/2020-01-20-gulp-gulpimagemin/
        ** gifsicle (GIF 圖片優化器): https://github.com/imagemin/imagemin-gifsicle
        ** mozjpeg (JPEG 圖片優化器): https://github.com/imagemin/imagemin-mozjpeg
        ** optipng (PNG 圖片優化器): https://github.com/imagemin/imagemin-optipng
        ** svgo (SVG 圖片優化器): https://github.com/imagemin/imagemin-svgo
      */
      [
        mozjpeg({
          quality: 65, // 壓縮品質
        }),
        optipng({
          optimizationLevel: 3, // 優化級別
        }),
        imageminSvgo({
          plugins: [
            { removeViewBox: true },
            { cleanupIDs: false },
            { removeDimensions: true } // 如果有 viewbox 則不需要 width 和 height 
          ]
        })
      ]
    )))
    .pipe(gulp.dest('./output/assets/img'))
});

gulp.task('deploy', function() {
  return gulp
    .src('./output/**/*')
    .pipe($.ghPages());
});

gulp.task('build', 
  gulp.series(
    'clean',
    vendorJs,
    'iconfont',
    gulp.parallel(
      'jade', 
      'sass', 
      'babel', 
      'imageMin'
    )
  )
);

gulp.task('default', 
  gulp.series(
    'clean', 
    vendorJs,
    'iconfont',
    gulp.parallel(
      'jade', 
      'sass', 
      'babel', 
      'imageMin'
    ),
    function(done){

      browserSync.init({
        server: { baseDir: "./output" },
        reloadDebounce: 1500,
        // 此段加入以後，重新整理的間隔必須超過 2 秒，可以依據需求調整使用
        browser: [
          // 可一次開啟多種瀏覽器
          "Firefox Developer Edition",
          // "Firefox",
          // "Google Chrome",
          // "Microsoft Edge",
          // "Opera",
        ]
      });

      gulp.watch('./source/assets/scss/**/*.scss', gulp.series('sass'));
      gulp.watch('./source/**/*.jade', gulp.series('jade'));
      gulp.watch('./source/assets/js/**/*.js', gulp.series('babel'));

      done();
    }
  )
);

