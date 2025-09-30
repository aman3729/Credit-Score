import { UserService } from './services/UserService.js';
import { AuthController } from './controllers/AuthController.js';
import { UserController } from './controllers/UserController.js';
import { CreditScoreService } from './services/CreditScoreService.js';
import { UploadService } from './services/UploadService.js';
import { EmailService } from './services/EmailService.js';
import { NotificationService } from './services/NotificationService.js';

/**
 * Dependency injection container
 * Manages service dependencies and provides singleton instances
 */
export class Container {
  constructor() {
    this.services = new Map();
    this.controllers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all services and controllers
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    // Initialize services
    this.registerServices();
    
    // Initialize controllers
    this.registerControllers();

    this.initialized = true;
  }

  /**
   * Register all services
   */
  registerServices() {
    // Core services
    this.services.set('userService', new UserService());
    this.services.set('creditScoreService', new CreditScoreService());
    this.services.set('uploadService', new UploadService());
    this.services.set('emailService', new EmailService());
    this.services.set('notificationService', new NotificationService());
  }

  /**
   * Register all controllers
   */
  registerControllers() {
    // Get service instances
    const userService = this.services.get('userService');
    const creditScoreService = this.services.get('creditScoreService');
    const uploadService = this.services.get('uploadService');
    const emailService = this.services.get('emailService');
    const notificationService = this.services.get('notificationService');

    // Register controllers with their dependencies
    this.controllers.set('authController', new AuthController(userService));
    this.controllers.set('userController', new UserController(userService));
    // TODO: Add other controllers as they are implemented
    // this.controllers.set('creditScoreController', new CreditScoreController(creditScoreService));
    // this.controllers.set('uploadController', new UploadController(uploadService));
    // this.controllers.set('adminController', new AdminController(
    //   userService,
    //   creditScoreService,
    //   uploadService,
    //   notificationService
    // ));
  }

  /**
   * Get a service instance
   * @param {string} serviceName - Name of the service
   * @returns {Object} Service instance
   */
  getService(serviceName) {
    if (!this.initialized) {
      this.initialize();
    }

    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    return service;
  }

  /**
   * Get a controller instance
   * @param {string} controllerName - Name of the controller
   * @returns {Object} Controller instance
   */
  getController(controllerName) {
    if (!this.initialized) {
      this.initialize();
    }

    const controller = this.controllers.get(controllerName);
    if (!controller) {
      throw new Error(`Controller '${controllerName}' not found`);
    }

    return controller;
  }

  /**
   * Get all registered services
   * @returns {Map} Services map
   */
  getServices() {
    if (!this.initialized) {
      this.initialize();
    }

    return this.services;
  }

  /**
   * Get all registered controllers
   * @returns {Map} Controllers map
   */
  getControllers() {
    if (!this.initialized) {
      this.initialize();
    }

    return this.controllers;
  }

  /**
   * Register a custom service
   * @param {string} name - Service name
   * @param {Object} service - Service instance
   */
  registerService(name, service) {
    this.services.set(name, service);
  }

  /**
   * Register a custom controller
   * @param {string} name - Controller name
   * @param {Object} controller - Controller instance
   */
  registerController(name, controller) {
    this.controllers.set(name, controller);
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.services.clear();
    this.controllers.clear();
    this.initialized = false;
  }
}

// Create singleton instance
const container = new Container();

export default container; 