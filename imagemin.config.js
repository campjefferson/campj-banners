module.exports = {
  gifsicle: { optimizationLevel: 2, interlaced: false, colors: 10 },
  mozjpeg: { progressive: true, quality: 10 },
  pngquant: { quality: [0.7, 0.9] },
  svgo: {
    plugins: [{ removeViewBox: false }, { cleanupIDs: true }],
  },
  webp: { quality: 10 },
};
