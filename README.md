# Sequelize Paper Trail

> Track changes to your models, for auditing or versioning. See how a model looked at any stage in its lifecycle, revert it to any version, or restore it after it has been destroyed. Record the user who created the version.


[![NPM](https://nodei.co/npm/@olympusone/sequelize_paper_trail.png?downloads=true)](https://nodei.co/npm/@olympusone/sequelize_paper_trail/)

[![node-version](https://img.shields.io/node/v/@olympusone/sequelize_paper_trail.svg)](https://www.npmjs.org/package/@olympusone/sequelize_paper_trail)
[![npm-version](https://img.shields.io/npm/v/@olympusone/sequelize_paper_trail.svg)](https://www.npmjs.org/package/@olympusone/sequelize_paper_trail)
[![GitHub release](https://img.shields.io/github/release/olympusone/sequelize_paper_trail.svg)](https://www.npmjs.org/package/olympusone/sequelize_paper_trail)
[![GitHub tag](https://img.shields.io/github/tag/olympusone/sequelize_paper_trail.svg)](https://www.npmjs.org/package/olympusone/sequelize_paper_trail)
[![npm-downloads](https://img.shields.io/npm/dt/@olympusone/sequelize_paper_trail.svg)](https://www.npmjs.org/package/@olympusone/sequelize_paper_trail)

[![license](https://img.shields.io/github/license/olympusone/sequelize_paper_trail.svg)](https://github.com/olympusone/sequelize_paper_trail/blob/master/LICENSE)

## Table of Contents

- [Sequelize Paper Trail](#sequelize-paper-trail)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Example](#example)
  - [User Tracking](#user-tracking)
  - [Disable logging for a single call](#disable-logging-for-a-single-call)
  - [Options](#options)
    - [Default options](#default-options)
    - [Options documentation](#options-documentation)
  - [Limitations](#limitations)
  - [Testing](#testing)
  - [Support](#support)
  - [Contributing](#contributing)
  - [Author](#author)
  - [Thanks](#thanks)
  - [Links](#links)

## Installation

```bash
npm install --save sequelize_paper_trail
```

*Note: the current test suite is very limited in coverage.*

## Usage

Sequelize Paper Trail assumes that you already set up your Sequelize connection, for example, like this:
```javascript
const Sequelize = require('sequelize');
const sequelize = new Sequelize('database', 'username', 'password');
```

then adding Sequelize Paper Trail is as easy as:

```javascript
const PaperTrail = require('sequelize_paper_trail').init(sequelize, Sequelize, options);
PaperTrail.defineModels();
```

which loads the Paper Trail library, and the `defineModels()` method sets up a `versions` table.

*Note: If you pass `userModel` option to `init` in order to enable user tracking, `userModel` should be setup before `defineModels()` is called.*

Then for each model that you want to keep a paper trail you simply add:

```javascript
Model.hasPaperTrail();
```

`hasPaperTrail` returns the `hasMany` association to the `versionModel` so you can keep track of the association for reference later.

### Example

```javascript
const Sequelize = require('sequelize');
const sequelize = new Sequelize('database', 'username', 'password');

const PaperTrail = require('sequelize_paper_trail').init(sequelize, Sequelize, options || {});
PaperTrail.defineModels();

const User = sequelize.define('User', {
  username: Sequelize.STRING,
  birthday: Sequelize.DATE
});

User.Versions = User.hasPaperTrail();
```

## User Tracking

There are 2 steps to enable user tracking, ie, recording the user who created a particular revision.
1. Enable user tracking by passing `userModel` option to `init`, with the name of the model which stores users in your application as the value.

```javascript
const options = {
  /* ... */
  userModel: 'user',
};
```
2. Pass the id of the user who is responsible for the database operation to `sequelize_paper_trail` either by sequelize options or by using [continuation-local-storage](https://www.npmjs.com/package/continuation-local-storage).

```javascript
Model.update({
  /* ... */
}, {
  userId: user.id
}).then(() {
  /* ... */
});
```
OR

```javascript
const createNamespace = require('continuation-local-storage').createNamespace;
const session = createNamespace('my session');

session.set('userId', user.id);

Model.update({
  /* ... */
}).then(() {
  /* ... */
});

```

To enable continuation-local-storage set `continuationNamespace` in initialization options.
Additionally, you may also have to call `.run()` or `.bind()` on your cls namespace, as described in the [docs](https://www.npmjs.com/package/continuation-local-storage).

## Disable logging for a single call

To not log a specific change to a versioned object, just pass a `noPaperTrail` with a truthy (true, 1, ' ') value.

```javascript
const instance = await Model.findOne();
instance.update({ noPaperTrail: true }).then(() {
  /* ... */
});
```

## Options

Paper Trail supports various options that can be passed into the initialization. The following are the default options:

### Default options

```javascript
// Default options
const options = {
  debug: false,
  log: null,
  exclude: [
    'id',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  versionModel: 'Version',
  tableName: 'versions',
  underscored: false,
  underscoredAttributes: false,
  versionAttributes: {
    itemId: 'itemId',
    itemType: 'itemType',
    object: 'object',
    objectChanges: 'objectChanges',
    userModelAttribute: 'whodunnit',
  },
  userModel: false,
  continuationNamespace: null,
  continuationKey: 'userId',
  mysql: false,
};
```

### Options documentation

| Option                      | Type    | Default Value                                                                                                        | Description                                                                                                                                                                                                            |
| --------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [debug]                     | Boolean | false                                                                                                                | Enables logging to the console.                                                                                                                                                                                        |
| [exclude]                   | Array   | ['id', 'createdAt', 'updatedAt', 'deletedAt', 'created_at', 'updated_at', 'deleted_at', [options.versionAttribute]] | Array of global attributes to exclude from the paper trail.                                                                                                                                                            |
| [versionModel]             | String  | 'Version'                                                                                                           | Name of the model that keeps the revision models.                                                                                                                                                                      |
| [tableName]                 | String  | 'versions'                                                                                                            | Name of the table that keeps the revision models. Passed to Sequelize. Necessary in Sequelize 5+ when underscored is true and the table is camelCase or  |
| [underscored]               | Boolean | false                                                                                                                | The [revisionModel] and [revisionChangeModel] have 'createdAt' and 'updatedAt' attributes, by default, setting this option to true changes it to 'created_at' and 'updated_at'.                                        |
| [underscoredAttributes]     | Boolean | false                                                                                                                | The [versionModel] has a [defaultAttribute] 'documentId', and the [revisionChangeModel] has a  [defaultAttribute] 'revisionId, by default, setting this option to true changes it to 'document_id' and 'revision_id'. |
| [defaultAttributes]         | Object  | { documentId: 'documentId', revisionId: 'revisionId' }                                                               |                                                                                                                                                                                                                        |
| [userModel]                 | String  |                                                                                                                      | Name of the model that stores users in your.                                                                                                                                                                           |
| [enableCompression]         | Boolean | false                                                                                                                | Compresses the revision attribute in the [revisionModel] to only the diff instead of all model attributes.                                                                                                             |
| [enableMigration]           | Boolean | false                                                                                                                | Automatically adds the [revisionAttribute] via a migration to the models that have paper trails enabled.                                                                                                               |
| [enableStrictDiff]          | Boolean | true                                                                                                                 | Reports integers and strings as different, e.g. `3.14` !== `'3.14'`                                                                                                                                                    |
| [continuationNamespace]     | String  |                                                                                                                      | Name of the name space used with the continuation-local-storage module.                                                                                                                                                |
| [continuationKey]           | String  | 'userId'                                                                                                             | The continuation-local-storage key that contains the user id.                                                                                                                                                          |
| [belongsToUserOptions]      | Object  | undefined                                                                                                            | The options used for belongsTo between userModel and Revision model                                                                                                                                                    |

## Limitations

* This project does not support models with composite primary keys. You can work around using a unique index with multiple fields.

## Testing

The tests are designed to run on SQLite3 in-memory tables, built from Sequelize migration files. If you want to actually generate a database file, change the storage option to a filename and run the tests. 

```bash
npm test
# or with yarn:
# yarn test
```

## Support

Please use:
* GitHub's [issue tracker](https://github.com/olympusone/sequelize_paper_trail/issues)

## Contributing

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Added some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## Author

© [OlympusOne](https://olympusone.com) – [@olympusone](https://twitter.com/olympusone01) – support@olympusone.com
Distributed under the MIT license. See ``LICENSE`` for more information.
[https://github.com/olympusone/sequelize_paper_trail](https://github.com/olympusone/)

## Thanks

This project was inspired by:
* [Sequelize Paper Trail](https://github.com/nielsgl/sequelize-paper-trail)
* [Sequelize-Revisions](https://github.com/bkniffler/sequelize-revisions)
* [Paper Trail](https://github.com/airblade/paper_trail)

Contributors:
 [https://github.com/olympusone/sequelize_paper_trail/graphs/contributors](https://github.com/olympusone/sequelize_paper_trail/graphs/contributors)

## Links
* [Example application](https://github.com/olympusone/sequelize_paper_trail-example)
