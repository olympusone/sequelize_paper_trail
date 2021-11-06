import cls from 'continuation-local-storage';
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
			objectChanges: 'objectChanges',
			userModelAttribute: 'whodunnit',
		},
		userModel: false,
		continuationNamespace: null,
		continuationKey: 'userId',
		mysql: false,
	};

	let ns = null;
	if (optsArg.continuationNamespace) {
		ns = cls.getNamespace(optsArg.continuationNamespace);

		if (!ns) {
			ns = cls.createNamespace(optsArg.continuationNamespace);
		}
	}

	if (optsArg.underscoredAttributes) {
		helpers.toUnderscored(defaultOptions.versionAttributes);
	}

	const options = _.defaults(optsArg, defaultOptions);

	const log = console.log;

	function createAfterHook(operation, operationOptions) {
		const afterHook = async function afterHook(instance, opt) {
			try{
				if (options.debug) {
					log('afterHook called');
					log('instance:', instance);
					log('opt:', opt);
	
					if (ns) {
						log(
							`CLS ${options.continuationKey}:`,
							ns.get(options.continuationKey),
						);
					}
				}
	
				if (opt.noPaperTrail) {
					if (options.debug) {
						log('noPaperTrail opt: is true, not logging');
					}
	
					return;
				}
	
				const destroyOperation = operation === 'destroy';
	
				let changedKeys = instance.changed().filter(i => !options.exclude.includes(i));
	
				if (operationOptions.only) {
					changedKeys = changedKeys.filter(i => operationOptions.only.includes(i))
				} else if (operationOptions.exclude) {
					changedKeys = changedKeys.filter(i => !operationOptions.exclude.includes(i))
				}
	
				// Build version
				const query = {
					[options.versionAttributes.itemType]: this.name,
					[options.versionAttributes.itemId]: instance.id,
					event: operation,
				};
	
				if (!destroyOperation && changedKeys.length) {
					const previousVersion = _.omit(instance._previousDataValues, options.exclude);
					const currentVersion = _.omit(instance.dataValues, options.exclude);
	
	
					// Get diffs
					let object = helpers.calcObject(
						changedKeys,
						currentVersion
					)
	
					let delta = helpers.calcDelta(
						changedKeys,
						previousVersion,
						currentVersion
					);
	
					if (options.debug) {
						log('object:', object);
						log('delta:', delta);
					}
	
					if (options.mysql) {
						object = JSON.stringify(object)
						delta = JSON.stringify(delta)
					}
	
	
					[options.versionAttributes.object] = object;
					[options.versionAttributes.objectChanges] = delta;
				}
	
				if (options.userModel) {
					query[options.versionAttributes.userModelAttribute] = (ns && ns.get(options.continuationKey)) || opt.userId;
				}
	
				const Version = sequelize.model(options.versionModel);
				const version = Version.build(query);
	
				if (options.debug) {
					log('end of afterHook');
				}
	
				// Save version
				await version.save({ transaction: opt.transaction })
			}catch(err){
				log('Version save error', err);
				throw err;
			}
		};

		return afterHook;
	}

	// Extend model prototype with "hasPaperTrail" function
	// Call model.hasPaperTrail() to enable revisions for model
	_.assignIn(Sequelize.Model, {
		hasPaperTrail(paperOptions = {}) {
			if (options.debug) {
				log('Enabling paper trail on', this.name);
			}

			this.addHook('afterCreate', createAfterHook('create', paperOptions));
			this.addHook('afterDestroy', createAfterHook('destroy', paperOptions));
			this.addHook('afterUpdate', createAfterHook('update', paperOptions));

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
			const attributes = {
				[options.versionAttributes.itemType]: {
					type: Sequelize.INTEGER,
					allowNull: false,
				},
				[options.versionAttributes.itemId]: {
					type: Sequelize.TEXT,
					allowNull: false,
				},
				[options.versionAttributes.object]: {
					type: Sequelize.JSONB,
					allowNull: false,
				},
				[options.versionAttributes.objectChanges]: {
					type: Sequelize.JSONB,
					allowNull: false,
				},
				event: Sequelize.STRING(10),
			};

			if (options.mysql) {
				attributes[options.versionAttributes.object].type = Sequelize.TEXT('LONGTEXT');
				attributes[options.versionAttributes.objectChanges].type = Sequelize.TEXT('LONGTEXT');
			}

			if (options.userModel) {
				attributes[options.versionAttributes.userModelAttribute] = {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: {
						model: options.userModel,
						key: 'id'
					}
				}
			}

			if (options.debug) {
				log('attributes', attributes);
			}

			// Version model
			class Version extends Sequelize.Model {
				static associate(models) {
					// models.Version.belongsTo(models[this.model], {
					// 	as: this.model,
					// 	foreignKey: options.versionAttributes.itemId,
					// });

					if (options.userModel) {
						models.Version.belongsTo(models[options.userModel], {
							as: options.userModel,
							foreignKey: options.versionAttributes.userModelAttribute,
						});
					}
				}
			}

			Version.init(attributes, {
				sequelize,
				modelName: options.versionModel,
				underscored: options.underscored,
				tableName: options.tableName,
				updatedAt: false,
			})

			if (db) db[Version.name] = Version;

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
