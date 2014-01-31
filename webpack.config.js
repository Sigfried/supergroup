module.exports = {
    entry: './supergroup.js',
    output: {
        path: './',
        filename: 'bundle.js',
    },
    resolve: {
        modulesDirectories: ['node_modules', 'bower_components'],
    },
    watch: true,
    colors: true,
    progress: true,
    cache: true,
    debug: true
};
