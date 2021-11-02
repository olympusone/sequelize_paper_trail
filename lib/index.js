import Sequelize from 'sequelize';
import cls from 'continuation-local-storage';
import * as jsdiff from 'diff';
import _ from 'lodash';
import helpers from './helpers';

let failHard = false;

exports.init = (sequelize, optionsArg) => {
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
		revisionChangeModel: 'RevisionChange',
		enableRevisionChangeModel: false,
		UUID: false,
		underscored: false,
		underscoredAttributes: false,
		defaultAttributes: {
			itemId: 'itemId',
			itemType: 'itemType',
		},
		userModel: false,
		userModelAttribute: 'userId',
		enableCompression: false,
		enableStrictDiff: true,
		continuationNamespace: null,
		continuationKey: 'userId',
		metaDataFields: null,
		metaDataContinuationKey: 'metaData',
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
		helpers.toUnderscored(defaultOptions.defaultAttributes);
	}

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

			// 		if (opt.noPaperTrail) {
			// 			if (options.debug) {
			// 				log('noPaperTrail opt: is true, not logging');
			// 			}
			// 			return;
			// 		}

			// 		const destroyOperation = operation === 'destroy';

			// 		let previousVersion = {};
			// 		let currentVersion = {};
			// 		if (!destroyOperation && options.enableCompression) {
			// 			_.forEach(opt.defaultFields, a => {
			// 				previousVersion[a] = instance._previousDataValues[a];
			// 				currentVersion[a] = instance.dataValues[a];
			// 			});
			// 		} else {
			// 			previousVersion = instance._previousDataValues;
			// 			currentVersion = instance.dataValues;
			// 		}
			// Supported nested models.
			// 		previousVersion = _.omitBy(
			// 			previousVersion,
			// 			i => i != null && typeof i === 'object' && !(i instanceof Date),
			// 		);
			// 		previousVersion = _.omit(previousVersion, options.exclude);

			// 		currentVersion = _.omitBy(
			// 			currentVersion,
			// 			i => i != null && typeof i === 'object' && !(i instanceof Date),
			// 		);
			// 		currentVersion = _.omit(currentVersion, options.exclude);

			// Get diffs
			// 		const delta = helpers.calcDelta(
			// 			previousVersion,
			// 			currentVersion,
			// 			options.exclude,
			// 			options.enableStrictDiff,
			// 		);

			// 		if (options.debug) {
			// 			log('delta:', delta);
			// 		}

			// 		// Check if all required fields have been provided to the opts / CLS
			// 		if (options.metaDataFields) {
			// 			// get all required field keys as an array
			// 			const requiredFields = _.keys(
			// 				_.pickBy(
			// 					options.metaDataFields,
			// 					function isMetaDataFieldRequired(required) {
			// 						return required;
			// 					},
			// 				),
			// 			);
			// 			if (requiredFields && requiredFields.length) {
			// 				const metaData =
			// 					(ns && ns.get(options.metaDataContinuationKey)) ||
			// 					opt.metaData;
			// 				const requiredFieldsProvided = _.filter(
			// 					requiredFields,
			// 					function isMetaDataFieldNonUndefined(field) {
			// 						return metaData[field] !== undefined;
			// 					},
			// 				);
			// 				if (
			// 					requiredFieldsProvided.length !== requiredFields.length
			// 				) {
			// 					log(
			// 						'Required fields: ',
			// 						options.metaDataFields,
			// 						requiredFields,
			// 					);
			// 					log(
			// 						'Required fields provided: ',
			// 						metaData,
			// 						requiredFieldsProvided,
			// 					);
			// 					throw new Error(
			// 						'Not all required fields are provided to paper trail!',
			// 					);
			// 				}
			// 			}
			// 		}

			// 		if (destroyOperation || (delta && delta.length > 0)) {
			// 			if (!instance.context) {
			// 				instance.context = {};
			// 			}
			// 			instance.context.delta = delta;
			// 		}

			// 		if (options.debug) {
			// 			log('end of beforeHook');
			// 		}
		};

		return beforeHook;
	}

	function createAfterHook(operation) {
		const afterHook = function afterHook(instance, opt) {
			// 		if (options.debug) {
			// 			log('afterHook called');
			// 			log('instance:', instance);
			// 			log('opt:', opt);
			// 			if (ns) {
			// 				log(
			// 					`CLS ${options.continuationKey}:`,
			// 					ns.get(options.continuationKey),
			// 				);
			// 			}
			// 		}

			// 		const destroyOperation = operation === 'destroy';

			// 		if (
			// 			instance.context &&
			// 			((instance.context.delta &&
			// 				instance.context.delta.length > 0) ||
			// 				destroyOperation)
			// 		) {
			// 			const Revision = sequelize.model(options.versionModel);
			// 			let RevisionChange;

			// 			if (options.enableRevisionChangeModel) {
			// 				RevisionChange = sequelize.model(
			// 					options.revisionChangeModel,
			// 				);
			// 			}

			// 			const { delta } = instance.context;

			// 			let previousVersion = {};
			// 			let currentVersion = {};
			// 			if (!destroyOperation && options.enableCompression) {
			// 				_.forEach(opt.defaultFields, a => {
			// 					previousVersion[a] = instance._previousDataValues[a];
			// 					currentVersion[a] = instance.dataValues[a];
			// 				});
			// 			} else {
			// 				previousVersion = instance._previousDataValues;
			// 				currentVersion = instance.dataValues;
			// 			}

			// 			// Supported nested models.
			// 			previousVersion = _.omitBy(
			// 				previousVersion,
			// 				i =>
			// 					i != null &&
			// 					typeof i === 'object' &&
			// 					!(i instanceof Date),
			// 			);
			// 			previousVersion = _.omit(previousVersion, options.exclude);

			// 			currentVersion = _.omitBy(
			// 				currentVersion,
			// 				i =>
			// 					i != null &&
			// 					typeof i === 'object' &&
			// 					!(i instanceof Date),
			// 			);
			// 			currentVersion = _.omit(currentVersion, options.exclude);

			// 			if (failHard && ns && !ns.get(options.continuationKey)) {
			// 				throw new Error(
			// 					`The CLS continuationKey ${options.continuationKey} was not defined.`,
			// 				);
			// 			}

			// 			let document = currentVersion;

			// 			if (options.mysql) {
			// 				document = JSON.stringify(document);
			// 			}

			// 			// Build revision
			// 			const query = {
			// 				model: this.name,
			// 				document,
			// 				operation,
			// 			};

			// 			// Add all extra data fields to the query object
			// 			if (options.metaDataFields) {
			// 				const metaData =
			// 					(ns && ns.get(options.metaDataContinuationKey)) ||
			// 					opt.metaData;
			// 				if (metaData) {
			// 					_.forEach(
			// 						options.metaDataFields,
			// 						function getMetaDataValues(required, field) {
			// 							const value = metaData[field];
			// 							if (options.debug) {
			// 								log(
			// 									`Adding metaData field to Revision - ${field} => ${value}`,
			// 								);
			// 							}
			// 							if (!(field in query)) {
			// 								query[field] = value;
			// 							} else if (options.debug) {
			// 								log(
			// 									`Revision object already has a value at ${field} => ${query[field]}`,
			// 								);
			// 								log('Not overwriting the original value');
			// 							}
			// 						},
			// 					);
			// 				}
			// 			}

			// 			// in case of custom user models that are not 'userId'
			// 			query[options.userModelAttribute] =
			// 				(ns && ns.get(options.continuationKey)) || opt.userId;

			// 			query[options.defaultAttributes.documentId] = instance.id;

			// 			const revision = Revision.build(query);

			// 			// Save revision
			// 			return revision
			// 				.save({ transaction: opt.transaction })
			// 				.then(objectRevision => {
			// 					// Loop diffs and create a revision-diff for each
			// 					if (options.enableRevisionChangeModel) {
			// 						_.forEach(delta, difference => {
			// 							const o = helpers.diffToString(
			// 								difference.item
			// 									? difference.item.lhs
			// 									: difference.lhs,
			// 							);
			// 							const n = helpers.diffToString(
			// 								difference.item
			// 									? difference.item.rhs
			// 									: difference.rhs,
			// 							);

			// 							// let document = difference;
			// 							document = difference;
			// 							let diff = o || n ? jsdiff.diffChars(o, n) : [];

			// 							if (options.mysql) {
			// 								document = JSON.stringify(document);
			// 								diff = JSON.stringify(diff);
			// 							}

			// 							const d = RevisionChange.build({
			// 								path: difference.path[0],
			// 								document,
			// 								diff,
			// 								revisionId: objectRevision.id,
			// 							});

			// 							d.save({ transaction: opt.transaction })
			// 								.then(savedD => {
			// 									// Add diff to revision
			// 									objectRevision[
			// 										`add${helpers.capitalizeFirstLetter(
			// 											options.revisionChangeModel,
			// 										)}`
			// 									](savedD);

			// 									return null;
			// 								})
			// 								.catch(err => {
			// 									log('RevisionChange save error', err);
			// 									throw err;
			// 								});
			// 						});
			// 					}
			// 					return null;
			// 				})
			// 				.catch(err => {
			// 					log('Revision save error', err);
			// 					throw err;
			// 				});
			// 		}

			// 		if (options.debug) {
			// 			log('end of afterHook');
			// 		}

			// 		return null;
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
				foreignKey: options.defaultAttributes.itemId,
				constraints: false,
				scope: {
					[options.defaultAttributes.itemType]: this.name,
				},
			});
		},
	});

	return {
		// Return defineModels()
		defineModels(db) {
			// Attributes for VersionModel
			let attributes = {
				[options.defaultAttributes.itemType]: {
					type: Sequelize.INTEGER,
					allowNull: false,
				},
				[options.defaultAttributes.itemId]: {
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
				attributes.document.type = Sequelize.TEXT('MEDIUMTEXT');
			}

			// 	if (options.UUID) {
			// 		attributes.id = {
			// 			primaryKey: true,
			// 			type: Sequelize.UUID,
			// 			defaultValue: Sequelize.UUIDV4,
			// 		};

			// 		attributes[options.defaultAttributes.documentId].type =
			// 			Sequelize.UUID;
			// 	}

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
		},
	};
};

/**
 * Throw exceptions when the user identifier from CLS is not set
 */
exports.enableFailHard = () => {
	failHard = true;
};

module.exports = exports;
