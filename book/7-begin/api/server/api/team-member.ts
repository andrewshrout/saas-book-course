import * as express from 'express';

import { signRequestForUpload } from '../aws-s3';
import User from '../models/User';

import { createSession } from '../stripe';

const router = express.Router();

router.use((req, res, next) => {
  console.log('team member API', req.path);
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
});

// Get signed request from AWS S3 server
router.post('/aws/get-signed-request-for-upload-to-s3', async (req, res, next) => {
  try {
    const { fileName, fileType, prefix, bucket } = req.body;

    const returnData = await signRequestForUpload({
      fileName,
      fileType,
      prefix,
      bucket,
    });

    //console.log(returnData);

    res.json(returnData);
  } catch (err) {
    next(err);
  }
});

router.post('/user/toggle-theme', async (req, res, next) => {
  try {
    const { darkTheme } = req.body;

    await User.toggleTheme({ userId: req.user.id, darkTheme });

    res.json({ done: 1 });
  } catch (err) {
    next(err);
  }
});

router.post('/user/update-profile', async (req, res, next) => {
  try {
    const { name, avatarUrl } = req.body;

    const updatedUser = await User.updateProfile({
      userId: req.user.id,
      name,
      avatarUrl,
    });
    res.json({ updatedUser });
  } catch (err) {
    next(err);
  }
});

router.post('/stripe/fetch-checkout-session', async (req, res, next) => {
  try {
    const { mode } = req.body;

    const user = await User.findById(req.user.id)
      .select(['stripeCustomer', 'email'])
      .setOptions({ lean: true });

    if (!user) {
      throw new Error('Permission denied');
    }

    const session = await createSession({
      mode,
      userId: user._id.toString(),
      userEmail: user.email,
      customerId: (user.stripeCustomer && user.stripeCustomer.id) || undefined,
      subscriptionId: (user.stripeSubscription && user.stripeSubscription.id) || undefined,
    });

    res.json({ sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

router.post('/cancel-subscription', async (req, res, next) => {
  try {
    const { isSubscriptionActive } = await User.cancelSubscription({
      uid: req.user.id,
    });

    res.json({ isSubscriptionActive });
  } catch (err) {
    next(err);
  }
});

router.get('/get-list-of-invoices-for-customer', async (req, res, next) => {
  try {
    const { stripeListOfInvoices } = await User.getListOfInvoicesForCustomer({
      userId: req.user.id,
    });
    res.json({ stripeListOfInvoices });
  } catch (err) {
    next(err);
  }
});
export default router;
