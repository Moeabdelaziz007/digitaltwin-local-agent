import { clerkMiddleware } from "@clerk/nextjs/server";
export default clerkMiddleware(async (auth, request) => {
  const authObj = await auth();
  authObj.protect();
});
