import cls from 'continuation-local-storage';
import * as jsdiff from 'diff';
import _ from 'lodash';
import helpers from './helpers';

let failHard = false;

exports.init = (sequelize, Sequelize, optionsArg) => {
	// In case that options is being parsed as a readonly attribute.
	// Or it is not passed at all
	const optsArg = _.cloneDeep(optionsArg || {});

	const defaultOptions = {
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
			objectChanges: 'objectChanges'
		},
		userModel: false,
		userModelAttribute: 'userId',
		mysql: false,
	};

	if (optsArg.underscoredAttributes) {
		helpers.toUnderscored(defaultOptions.versionAttributes);
	}

	console.log(defaultOptions.versionAttributes)

	const options = _.defaults(optsArg, defaultOptions);

	// TODO: implement logging option
	const log = options.log || console.log;

	function createBeforeHook(operation) {
		const beforeHook = function beforeHook(instance, opt) {
			if (options.debug) {
				log('beforeHook called');
				log('instance:', instance);
				log('opt:', opt);
			}

			if (opt.noPaperTrail) {
				if (options.debug) {
					log('noPaperTrail opt: is true, not logging');
				}

				return;
			}

			const destroyOperation = operation === 'destroy';

			const changedKeys = instance.changed();

			if (!destroyOperation && changedKeys.length) {
				const previousVersion = _.omit(instance._previousDataValues, options.exclude);
				const currentVersion = _.omit(instance.dataValues, options.exclude);


				// Get diffs
				const delta = helpers.calcDelta(
					changedKeys,
					previousVersion,
					currentVersion
				);

				if (options.debug) {
					log('delta:', delta);
				}
			}

			if (options.debug) {
				log('end of beforeHook');
			}
		};

		return beforeHook;
	}

	function createAfterHook(operation) {
		const afterHook = function afterHook(instance, opt) {
			if (options.debug) {
				log('afterHook called');
				log('instance:', instance);
				log('opt:', opt);
			}

			if (opt.noPaperTrail) {
				if (options.debug) {
					log('noPaperTrail opt: is true, not logging');
				}

				return;
			}

			const destroyOperation = operation === 'destroy';

			const changedKeys = instance.changed();

			if (!destroyOperation && changedKeys.length) {
				const previousVersion = _.omit(instance._previousDataValues, options.exclude);
				const currentVersion = _.omit(instance.dataValues, options.exclude);


				// Get diffs
				const delta = helpers.calcDelta(
					changedKeys,
					previousVersion,
					currentVersion
				);

				if (options.debug) {
					log('delta:', delta);
				}

				// Build version
				const query = {
					model: this.name,
					// object,
					[versionAttributes.objectChanges]: delta,
				};

				// in case of custom user models that are not 'userId'
				query[options.userModelAttribute] = opt.userId;

				query[options.versionAttributes.itemId] = instance.id;

				const Version = sequelize.model(options.versionModel);
				const version = Version.build(query);

				// Save revision
				return revision
					.save({ transaction: opt.transaction })
					.catch(err => {
						log('Revision save error', err);
						throw err;
					});
			}

			if (options.debug) {
				log('end of afterHook');
			}

			return null;
		};

		return afterHook;
	}

	// Extend model prototype with "hasPaperTrail" function
	// Call model.hasPaperTrail() to enable revisions for model
	_.assignIn(Sequelize.Model, {
		hasPaperTrail() {
			if (options.debug) {
				log('Enabling paper trail on', this.name);
			}

			this.versionable = true;

			this.addHook('beforeCreate', createBeforeHook('create'));
			this.addHook('beforeDestroy', createBeforeHook('destroy'));
			this.addHook('beforeUpdate', createBeforeHook('update'));
			this.addHook('afterCreate', createAfterHook('create'));
			this.addHook('afterDestroy', createAfterHook('destroy'));
			this.addHook('afterUpdate', createAfterHook('update'));

			// create association
			return this.hasMany(sequelize.models[options.versionModel], {
				foreignKey: options.versionAttributes.itemId,
				constraints: false,
				scope: {
					[options.versionAttributes.itemType]: this.name,
				},
			});
		},
	});

	return {
		defineModels(db) {
			// Attributes for VersionModel
			let attributes = {
				[options.versionAttributes.itemType]: {
					type: Sequelize.INTEGER,
					allowNull: false,
				},
				[options.versionAttributes.itemId]: {
					type: Sequelize.TEXT,
					allowNull: false,
				},
				object: {
					type: Sequelize.JSONB,
					allowNull: false,
				},
				object_changes: {
					type: Sequelize.JSONB,
					allowNull: false,
				},
				event: Sequelize.STRING(7),
			};

			if (options.mysql) {
				attributes.object.type = Sequelize.TEXT('MEDIUMTEXT');
				attributes.object_changes.type = Sequelize.TEXT('MEDIUMTEXT');
			}
			
			if (options.debug) {
				log('attributes', attributes);
			}

			// Version model
			const Version = sequelize.define(
				options.versionModel,
				attributes,
				{
					underscored: options.underscored,
					tableName: options.tableName,
				},
			);

			Version.associate = function associate(models) {
				if (options.debug) {
					log('models', models);
				}

				Version.belongsTo(
					sequelize.model(options.userModel),
					options.belongsToUserOptions,
				);
			};

			if (db) db[Version.name] = Version;

			/*
			 * We could extract this to a separate function so that having a
			 * user model doesn't require different loading
			 *
			 * or perhaps we could omit this because we are creating the
			 * association through the associate call above.
			 */
			if (options.userModel) {
				Version.belongsTo(
					sequelize.model(options.userModel),
					options.belongsToUserOptions,
				);
			}

			return Version;
		}
	};
};

/**
 * Throw exceptions when the user identifier from CLS is not set
 */
exports.enableFailHard = () => {
	failHard = true;
};

module.exports = exports;
