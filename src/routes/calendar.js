import Joi from 'joi';
import { CalendarRepository, EventRepository } from '../repositories';
import { CALENDAR_ENDPOINT } from '../config/endpoints';
import {
  CALENDAR_SLUG_MIN_LENGTH,
  CALENDAR_SLUG_MAX_LENGTH,
  CALENDAR_NAME_MIN_LENGTH,
  CALENDAR_NAME_MAX_LENGTH,
  CALENDAR_TYPE_MIN_LENGTH,
  CALENDAR_TYPE_MAX_LENGTH,
  CALENDAR_DESCRIPTION_MIN_LENGTH,
  CALENDAR_DESCRIPTION_MAX_LENGTH,
  CALENDAR_PRIVACY_MAX_LEVEL,
} from '../config/rules';
import * as et from '../enum/EnumTypes';
import redis from '../redis';
import { isAuthorized } from '../utils/auth';
import { CALENDAR_PRIVACY_LEVEL } from '../config/redis';

export default (createRoute) => {
  // Get calendar index
  createRoute({
    method: 'GET',
    path: `${CALENDAR_ENDPOINT}`,
    // TODO: refactor, smth is wrong ^
    async handler(req, res) {
      const calendars = await CalendarRepository.findAll(req.user.email);
      if (!calendars) {
        res.status(400).json({ code: 400, success: false, message: 'No calendars found for this user' });
      }
      res.status(200).json({ code: 200, success: true, payload: calendars });
    },
  });

  // Get calendar by slug
  createRoute({
    method: 'GET',
    auth: false,
    path: `${CALENDAR_ENDPOINT}/:slug`,
    validation: {
      params: {
        slug: Joi.string()
          .min(CALENDAR_SLUG_MIN_LENGTH)
          .max(CALENDAR_SLUG_MAX_LENGTH)
          .required(),
      },
    },
    async handler(req, res) {
      const privacy = await redis.hgetAsync(CALENDAR_PRIVACY_LEVEL, req.params.slug);

      async function getEvents(slug) {
        const events = await EventRepository.findAllBySlug(slug);
        if (events) {
          res.status(200).json({ code: 200, success: true, payload: events });
        }
        res.status(400).json({ code: 400, success: false, message: 'No events found by slug' });
      }

      if (privacy === et.PRIVACY_LEVEL_PRIVATE) {
        // TODO: check if my...
        if (isAuthorized(req)) {
          await getEvents(req.params.slug);
        }
        res.status(400).json({ code: 400, success: false, message: 'Not authorized' });
      }

      getEvents(req.params.slug);
    },
  });

  // Create calendar
  createRoute({
    method: 'POST',
    path: `${CALENDAR_ENDPOINT}`,
    validation: {
      body: {
        slug: Joi.string()
          .min(CALENDAR_SLUG_MIN_LENGTH)
          .max(CALENDAR_SLUG_MAX_LENGTH),
        name: Joi.string()
          .min(CALENDAR_NAME_MIN_LENGTH)
          .max(CALENDAR_NAME_MAX_LENGTH),
        description: Joi.string()
          .min(CALENDAR_DESCRIPTION_MIN_LENGTH)
          .max(CALENDAR_DESCRIPTION_MAX_LENGTH),
        type: Joi.string()
          .min(CALENDAR_TYPE_MIN_LENGTH)
          .max(CALENDAR_TYPE_MAX_LENGTH),
        privacy: Joi.string()
          .min(CALENDAR_TYPE_MIN_LENGTH)
          .max(CALENDAR_TYPE_MAX_LENGTH),
      },
    },
    async handler(req, res) {
      const calendar = await CalendarRepository.create(req.body);
      if (!calendar) {
        res.status(400).json({ code: 400, success: false, message: 'Required fields missing' });
      }
      res.status(200).json({ code: 200, success: true, payload: calendar });
    },
  });

  // Update calendar by slug
  createRoute({
    // TODO: update event refactor
    method: 'PUT',
    path: `${CALENDAR_ENDPOINT}/:slug`,
    validation: {
      params: {
        slug: Joi.string()
          .min(CALENDAR_SLUG_MIN_LENGTH)
          .max(CALENDAR_SLUG_MAX_LENGTH)
          .required(),
      },
      body: {
        slug: Joi.string()
          .min(CALENDAR_SLUG_MIN_LENGTH)
          .max(CALENDAR_SLUG_MAX_LENGTH),
        name: Joi.string()
          .min(CALENDAR_NAME_MIN_LENGTH)
          .max(CALENDAR_NAME_MAX_LENGTH),
        description: Joi.string()
          .min(CALENDAR_DESCRIPTION_MIN_LENGTH)
          .max(CALENDAR_DESCRIPTION_MAX_LENGTH),
        type: Joi.string()
          .min(CALENDAR_TYPE_MIN_LENGTH)
          .max(CALENDAR_TYPE_MAX_LENGTH),
        privacy: Joi.number().integer()
          .min(0)
          .max(CALENDAR_PRIVACY_MAX_LEVEL),
      },
    },
    async handler(req, res) {
      const calendar = await CalendarRepository.update(req.body);
      if (!calendar) {
        res.status(400).json({ code: 400, success: false, message: 'Required fields missing' });
      }
      res.status(200).json({ code: 200, success: true, payload: calendar });
    },
  });

  // Delete calendar (from index)
  createRoute({
    method: 'DELETE',
    path: `${CALENDAR_ENDPOINT}`,
    validation: {
      body: {
        slug: Joi.string()
          .min(CALENDAR_SLUG_MIN_LENGTH)
          .max(CALENDAR_SLUG_MAX_LENGTH)
          .required(),
      },
    },
    async handler(req, res) {
      const calendar = await CalendarRepository.findByUserIdAndSlug({ slug: req.body.slug, userId: req.user.id });
      if (!calendar) {
        res.status(400).json({ code: 400, success: false, message: 'Calendar not found' });
      }
      calendar.destroy();
      res.status(200).json({ code: 200, success: true, message: 'Calendar deleted' });
    },
  });

  // Delete calendar (by slug)
  createRoute({
    method: 'DELETE',
    path: `${CALENDAR_ENDPOINT}/:slug`,
    validation: {
      params: {
        slug: Joi.string()
          .min(CALENDAR_SLUG_MIN_LENGTH)
          .max(CALENDAR_SLUG_MAX_LENGTH)
          .required(),
      },
    },
    async handler(req, res) {
      const calendar = await CalendarRepository.findByUserIdAndSlug({ slug: req.params.slug, userId: req.user.id });
      if (!calendar) {
        res.status(400).json({ code: 400, success: false, message: 'Calendar not found' });
      }
      calendar.destroy();
      res.status(200).json({ code: 200, success: true, message: 'Calendar deleted' });
    },
  });
};
