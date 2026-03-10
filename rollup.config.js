import resolve from '@rollup/plugin-node-resolve';

const external = [
  'flarum/forum/app',
  'flarum/admin/app',
];

export default [
  {
    input: 'js/src/forum/index.js',
    output: {
      file: 'js/dist/forum.js',
      format: 'es',
      sourcemap: true,
    },
    external(id) {
      return external.some((e) => id === e || id.startsWith(e + '/'));
    },
    plugins: [resolve()],
  },
  {
    input: 'js/src/admin/index.js',
    output: {
      file: 'js/dist/admin.js',
      format: 'es',
      sourcemap: true,
    },
    external(id) {
      return external.some((e) => id === e || id.startsWith(e + '/'));
    },
    plugins: [resolve()],
  },
];
