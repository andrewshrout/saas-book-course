import * as express from 'express';

import User from '../models/User';

const router = express.Router();

// router.get('/get-user', (req, res) => {
//   res.json({ user: req.user || null });
// });

router.post('/get-user-by-slug', async (req, res, next) => {
  console.log('Express route');
  try {
    const { slug } = req.body;
    console.log(slug)
    const userDoc = await User.getUserBySlug({ slug });
    console.log(userDoc)
    res.json({ userDoc });
  } catch (err) {
    console.log(err);
    next(err);
  }
});

router.post('/user/update-profile', async (req, res, next) => {
  try {
    const { name, avatarUrl } = req.body;

    // define userId

    const userId = 'someString';

    const updatedUser = await User.updateProfile({
      userId: userId,
      name,
      avatarUrl,
    });

    res.json({ updatedUser });
  } catch (err) {
    next(err);
  }
});

export default router;
