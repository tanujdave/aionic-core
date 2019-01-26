import { bind } from 'decko'
import { Handler, NextFunction, Request, Response } from 'express'
import { sign, SignOptions } from 'jsonwebtoken'
import { use } from 'passport'
import { ExtractJwt, StrategyOptions } from 'passport-jwt'

import { permissions } from '../config/permissions'

import { BasicAuthStrategy } from '../modules/auth/strategies/basicAuth'
import { JwtStrategy } from '../modules/auth/strategies/jwt'

/**
 * - AuthService -
 *
 * Available passport strategies for authentication:
 *  - JWT (default)
 *  - Basic Auth
 *
 * Pass a strategy when initializing module routes to setup this strategy for the complete module
 * Each router's endpoint from the module will be protected
 * Example: new UserRoutes('jwt')
 *
 * To setup a strategy for individual endpoints in a module pass the strategy on isAuthorized call
 * Example: isAuthorized('basic')
 */
export class AuthService {
  private defaultStrategy: string
  private jwtStrategy: JwtStrategy
  private basicStrategy: BasicAuthStrategy

  private readonly strategyOptions: StrategyOptions = {
    audience: 'aionic-client',
    issuer: 'aionic-api',
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'aionic-secret-api-key'
  }

  // JWT options
  private readonly signOptions: SignOptions = {
    audience: this.strategyOptions.audience,
    expiresIn: '8h',
    issuer: this.strategyOptions.issuer
  }

  public constructor(defaultStrategy: string = 'jwt') {
    // Setup default strategy -> use jwt if none is provided
    this.defaultStrategy = defaultStrategy

    this.jwtStrategy = new JwtStrategy(this.strategyOptions)
    this.basicStrategy = new BasicAuthStrategy()
  }

  /**
   * Create JWT
   *
   * @param {number} userID
   * @returns {string}
   */
  public createToken(userID: number): string {
    const payload = { userID }

    return sign(payload, this.strategyOptions.secretOrKey as string, this.signOptions)
  }

  /**
   * Middleware for verifying user permissions from acl
   *
   * @param {string} resource
   * @param {string} permission
   * @returns {Handler}
   */
  public hasPermission(resource: string, permission: string): Handler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const uid: number = req.user.id
        const access: boolean = await permissions.isAllowed(uid, resource, permission)

        if (!access) {
          return res.status(403).json({
            error: 'missing user rights',
            status: 403
          })
        }

        return next()
      } catch (err) {
        return next(err)
      }
    }
  }

  /**
   * Init passport strategies
   *
   * @returns {void}
   */
  public initStrategies(): void {
    use('jwt', this.jwtStrategy.strategy)
    use('basic', this.basicStrategy.strategy)
  }

  /**
   * Setup target passport authorization
   *
   * @param {string} strategy
   * @returns {Handler}
   */
  @bind
  public isAuthorized(strategy?: string): Handler {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // if no strategy is provided use default strategy
        const tempStrategy = strategy || this.defaultStrategy
        return this.doAuthentication(req, res, next, tempStrategy)
      } catch (err) {
        return next(err)
      }
    }
  }

  /**
   * Executes the target passport authorization
   *
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   * @param {string} strategy
   * @returns {any}
   */
  @bind
  private doAuthentication(
    req: Request,
    res: Response,
    next: NextFunction,
    strategy: string
  ): void {
    try {
      switch (strategy) {
        case 'jwt':
          return this.jwtStrategy.isAuthorized(req, res, next)
        case 'basic':
          return this.basicStrategy.isAuthorized(req, res, next)
        default:
          throw new Error(`Unknown passport strategy: ${this.defaultStrategy}`)
      }
    } catch (err) {
      return next(err)
    }
  }
}