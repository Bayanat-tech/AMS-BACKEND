// import passport from "passport";
// import passportJWT from "passport-jwt";
// import constants from "../helpers/constants";
// import User from "../models/user";
// import { UserAttribute } from "../interfaces/user.interface";

// const JWTStrategy = passportJWT.Strategy;
// const ExtractJWT = passportJWT.ExtractJwt;

// passport.use(
//   new JWTStrategy(
//     {
//       jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
//       secretOrKey: constants.AUTHENTICATION.APP_SECRET,
//     },
//     async (jwtPayload, cb) => {
//       try {
//         await User.findOne({
//           where: { email_id: jwtPayload.email_id },
//         })
//           .then((user: User | null) => {
//             cb(null, (user ? user.dataValues : null) as UserAttribute);
//           })
//           .catch((err) => {
//             cb(err);
//           });
//       } catch (err) {
//         return cb(err, false);
//       }
//     }
//   )
// );

import passport from "passport";
import passportJWT from "passport-jwt";
import constants from "../helpers/constants";
import { UserService } from "../services/user.service";
import { IUser } from "../interfaces/user.interface";

const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: constants.AUTHENTICATION.APP_SECRET,
    },
    async (jwtPayload, cb) => {
      try {
        const user = await UserService.findUserByEmail(jwtPayload.email_id);
        if (user) {
          const userData: IUser = {
            company_code: user.company_code,
            loginid: user.loginid,
            email_id: user.email_id,
            username: user.username,
            contact_name: user.contact_name,
            contact_no: user.contact_no,
            contact_email: user.contact_email,
            updated_by: user.updated_by,
            created_by: user.created_by,
            created_at: user.created_at,
            userpass: user.userpass,
            no_of_days: user.no_of_days,
            active_flag: user.active_flag,
            SEC_PASSWD: user.SEC_PASSWD,
            APPLICATION: user.APPLICATION,
            country_code: user.company?.country,
          };
          cb(null, userData);
        } else {
          cb(null, false);
        }
      } catch (err) {
        return cb(err, false);
      }
    }
  )
);
