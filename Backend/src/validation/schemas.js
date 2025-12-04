const Joi = require('joi');

// Auth validation schemas
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Message validation schemas
const createMessageSchema = Joi.object({
  roomId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid room ID format',
      'any.required': 'Room ID is required'
    }),
  
  content: Joi.string()
    .min(1)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 5000 characters',
      'any.required': 'Message content is required'
    })
});

// Room validation schemas
const createRoomSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Room name cannot be empty',
      'string.max': 'Room name cannot exceed 100 characters',
      'any.required': 'Room name is required'
    }),
  
  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  type: Joi.string()
    .valid('group', 'private', 'direct')
    .default('group')
    .messages({
      'any.only': 'Invalid room type'
    }),
  
  members: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .messages({
      'array.min': 'At least one member is required',
      'string.pattern.base': 'Invalid member ID format'
    })
});

const createDirectRoomSchema = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required'
    })
});

const addMembersSchema = Joi.object({
  userIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one user ID is required',
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User IDs are required'
    })
});

// Sanitize HTML to prevent XSS
const sanitize = require('sanitize-html');

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return sanitize(input, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}
    });
  }
  return input;
};

module.exports = {
  registerSchema,
  loginSchema,
  createMessageSchema,
  createRoomSchema,
  createDirectRoomSchema,
  addMembersSchema,
  sanitizeInput
};
