// For the pinned public Receipt AI commit only; copied into an ephemeral checkout.
// Next.js 15's recommended flat ESLint configuration; never published to Receipt AI.
import {FlatCompat} from '@eslint/eslintrc';
const compat=new FlatCompat({baseDirectory:import.meta.dirname});
export default [
  ...compat.config({extends:['next/core-web-vitals','next/typescript']}),
  {ignores:['.next/**','node_modules/**','next-env.d.ts']}
];
