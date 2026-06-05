export default {
  input: 'src/_autoGen/openapi/user.openapi.json',
  output: 'src/_autoGen/api/user',
  parser: {
    transforms: {
      enums: 'root',
    },
  },
  plugins: [
    {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },
  ],
};
