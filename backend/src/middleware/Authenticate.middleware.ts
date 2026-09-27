import { Request, Response, NextFunction } from "express";
import {
  AccessTokenPayload,
  verifyAccessToken,
} from "../utils/auth/token.util";

import prisma from "../database/prismaClient/prisma";

/* =========================================================
   TYPES
========================================================= */

type UserRolePermission = {
  permittedSection: string;

  isPermitted?: Array<
    | string
    | {
        isPermitted?: string;
      }
  >;
};

type AuthenticatedUser = AccessTokenPayload & {
  userRole?: UserRolePermission[];
  permissionSections?: UserRolePermission[];
};


/* =========================================================
   EXPRESS REQUEST TYPE
========================================================= */

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;

      /**
       * Permissions that matched in authorize()
       *
       * Example:
       * ["aopInfo", "readOnly"]
       */
      permissions: string[];
    }
  }
}


/* =========================================================
   AUTHENTICATE
========================================================= */

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  /* -------------------------------------------------------
     CHECK AUTH HEADER
  ------------------------------------------------------- */

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Missing or malformed authorization header",
    });
  }


  /* -------------------------------------------------------
     GET TOKEN
  ------------------------------------------------------- */

  const token = authHeader.slice("Bearer ".length);

  let payload: ReturnType<typeof verifyAccessToken>;


  /* -------------------------------------------------------
     VERIFY TOKEN
  ------------------------------------------------------- */

  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }


  /* -------------------------------------------------------
     GET USER ID
  ------------------------------------------------------- */

  const userId = Number(payload?.userId);

  if (!Number.isInteger(userId)) {
    return res.status(401).json({
      message: "Invalid access token",
    });
  }


  /* -------------------------------------------------------
     LOAD FRESH PERMISSIONS FROM DATABASE
  ------------------------------------------------------- */

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        isActive: true,

        permissionSections: {
          select: {
            permittedSection: true,

            isPermitted: {
              select: {
                isPermitted: true,
              },
            },
          },
        },
      },
    });


    /* -----------------------------------------------------
       CHECK USER
    ----------------------------------------------------- */

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "User not found or deactivated",
      });
    }


    /* -----------------------------------------------------
       ATTACH USER + PERMISSIONS
    ----------------------------------------------------- */

    req.user = {
      ...payload,

      permissionSections:
        user.permissionSections,
    };


    /*
     * Reset matched permissions
     * for this request.
     */
    req.permissions = [];


    next();
  } catch (error) {
    next(error);
  }
}


/* =========================================================
   PERMISSION TYPES
========================================================= */

/**
 * authorize() supports:
 *
 * "addJob"
 *
 * ["addJob"]
 *
 * ["addJob", "bookingView"]
 *
 * (req) => "aopInfo"
 *
 * (req) => ["aopInfo", "readOnly"]
 */

type PermissionResolver =
  | string
  | string[]
  | ((req: Request) => string | string[]);


/* =========================================================
   AUTHORIZE
========================================================= */

export function authorize(
  permittedSection: string,
  permission: PermissionResolver
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    /* -----------------------------------------------------
       USER MUST BE AUTHENTICATED
    ----------------------------------------------------- */

    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }


    /* -----------------------------------------------------
       FIND PERMISSION SECTION
    ----------------------------------------------------- */

    const section =
      req.user.permissionSections?.find(
        (item) =>
          item.permittedSection ===
          permittedSection
      );


    if (!section) {
      return res.status(403).json({
        message: "Section access denied",
      });
    }


    /* -----------------------------------------------------
       RESOLVE PERMISSIONS
    ----------------------------------------------------- */

    const resolvedPermissions =
      typeof permission === "function"
        ? permission(req)
        : permission;


    /* -----------------------------------------------------
       ALWAYS CONVERT TO ARRAY
    ----------------------------------------------------- */

    const requiredPermissions =
      Array.isArray(resolvedPermissions)
        ? resolvedPermissions
        : [resolvedPermissions];


    /* -----------------------------------------------------
       NORMALIZE USER PERMISSIONS
    ----------------------------------------------------- */

    const userPermissions =
      (section.isPermitted ?? [])
        .map((item) => {

          if (typeof item === "string") {
            return item;
          }

          return item.isPermitted;
        })
        .filter(
          (item): item is string =>
            typeof item === "string"
        );


    /* -----------------------------------------------------
       FIND EXACT MATCHES
    ----------------------------------------------------- */

    const matchedPermissions =
      requiredPermissions.filter(
        (requiredPermission) =>
          userPermissions.includes(
            requiredPermission
          )
      );


    /* -----------------------------------------------------
       USER MUST MATCH AT LEAST ONE
    ----------------------------------------------------- */

    if (matchedPermissions.length === 0) {
      return res.status(403).json({
        message: "Permission denied",
      });
    }


    /* -----------------------------------------------------
       STORE MATCHED PERMISSIONS

       Controller can use:

       req.permissions.includes("aopInfo")
    ----------------------------------------------------- */

    req.permissions = matchedPermissions;


    /* -----------------------------------------------------
       AUTHORIZED
    ----------------------------------------------------- */

    next();
  };
}