/** True in the single-file build made for sharing (scripts/build-share.ts). That build uses an
 *  in-memory router, because the page host controls the URL. */
export const isShareBuild = import.meta.env.VITE_SHARE === '1'
