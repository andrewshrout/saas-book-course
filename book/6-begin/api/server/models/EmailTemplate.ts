import * as _ from 'lodash';
import * as mongoose from 'mongoose';

interface EmailTemplateDocument extends mongoose.Document {
  name: string;
  subject: string;
  message: string;
}

const EmailTemplate = mongoose.model<EmailTemplateDocument>(
  'EmailTemplate',
  new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  }),
);

export async function insertTemplates() {
  const templates = [
    {
      name: 'welcome',
      subject: 'Welcome to MapTools by Surveyor',
      message: `Welcome <%= userName %>,
        <p>
          Thanks for signing up on our <a href="https://github.com/async-labs/saas" target="blank">MapTools</a>!
        </p>
        <p>
          If you are learning how to use data driven investing check out our Map Starter Series and How to Invest With Machine Learning:
           <a href="https://builderbook.org" target="blank">Starter Guide</a>
           and
           <a href="https://builderbook.org/book" target="blank">Data Driven Investment</a>.
        </p>
        <p>
          Also check out our blog
          <a href="https://async-await.com" target="blank"> Blog</a>
          , as we unveil our roadmap and the future of real estate..
        </p>
        Nikhil & Andrew, Team Surveyor
      `,
    },
  ];

  for (const t of templates) {
    const et = await EmailTemplate.findOne({ name: t.name });
    const message = t.message
      .replace(/\n/g, '')
      .replace(/[ ]+/g, ' ')
      .trim();

    if (!et) {
      EmailTemplate.create(Object.assign({}, t, { message }));
    } else if (et.subject !== t.subject || et.message !== message) {
      EmailTemplate.updateOne({ _id: et._id }, { $set: { message, subject: t.subject } }).exec();
    }
  }
}

export default async function getEmailTemplate(name: string, params: any) {
  const et = await EmailTemplate.findOne({ name }).setOptions({
    lean: true,
  });

  if (!et) {
    throw new Error('Email Template is not found in database.');
  }

  return {
    message: _.template(et.message)(params),
    subject: _.template(et.subject)(params),
  };
}
