// Compatibility shim: re-export the central minio client from the project `src/lib` directory
// Some server routes (or the bundler) resolve imports into the `src/app` tree and expect
// `lib/minioClient` to sit under `src/app/lib`. To be robust we re-export from the single
// source-of-truth at `src/lib/minioClient`.
export * from '../../lib/minioClient';
