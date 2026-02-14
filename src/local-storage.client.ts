import {
    ensureErrorAndPrependMessage,
    mapObject,
    mapObjectValues,
    wrapInTry,
    type MaybePromise,
    type PartialWithUndefined,
    type RequiredAndNotNull,
} from '@augment-vir/common';
import {assertValidShape, checkValidShape, type Shape} from 'object-shape-tester';
import {type Constructor} from 'type-fest';
import {defineTypedCustomEvent, ListenTarget} from 'typed-event-target';

/**
 * Base type for the shapes type parameter in {@link LocalStorageClient}.
 *
 * @category Internal
 */
export type BaseLocalStorageClientShapes = Record<string, Shape>;

/**
 * Options for `LocalStorageClient.get`.
 *
 * @category Internal
 */
export type LocalStorageClientGetOptions = PartialWithUndefined<{
    /**
     * If set to `true`, errors will be thrown if JSON cannot be parsed or if the retrieved value
     * does not match its shape.
     *
     * @default false
     */
    throwErrorOnFailure: boolean;
}>;

/**
 * Type for `LocalStorageClient.get`.
 *
 * @category Internal
 */
export type LocalStorageClientGet<Shapes extends BaseLocalStorageClientShapes> = {
    [Key in keyof Shapes]: (
        options?: LocalStorageClientGetOptions | undefined,
    ) => Shapes[Key]['runtimeType'] | undefined;
};
/**
 * Type for `LocalStorageClient.listen`.
 *
 * @category Internal
 */
export type LocalStorageClientListen<Shapes extends BaseLocalStorageClientShapes> = {
    [Key in keyof Shapes]: (
        callback: (value: Shapes[Key]['runtimeType'] | undefined) => MaybePromise<void>,
    ) => () => void;
};
/**
 * Type for `LocalStorageClient.set`.
 *
 * @category Internal
 */
export type LocalStorageClientSet<Shapes extends BaseLocalStorageClientShapes> = {
    [Key in keyof Shapes]: (value: Shapes[Key]['runtimeType']) => Shapes[Key]['runtimeType'];
};
/**
 * Type for `LocalStorageClient.delete`.
 *
 * @category Internal
 */
export type LocalStorageClientDelete<Shapes extends BaseLocalStorageClientShapes> = {
    [Key in keyof Shapes]: () => void;
};
/**
 * Type for `LocalStorageClient.getAllValues()`.
 *
 * @category Internal
 */
export type LocalStorageClientAllValues<Shapes extends BaseLocalStorageClientShapes> = Partial<{
    [Key in keyof Shapes]: Shapes[Key]['runtimeType'];
}>;

/**
 * Options for {@link LocalStorageClient}.
 *
 * @category Internal
 */
export type LocalStorageClientOptions = {
    /** The local storage item name that all values are stored within. */
    storeName: string;
};

class LocalStorageClientAllValuesEvent extends defineTypedCustomEvent<any>()(
    'local-storage-client-all-values-event',
) {}

/**
 * An interface for storing values into the LocalStorage API with type safety. Note that only JSON
 * compatible data can be stored.
 *
 * @category Main
 */
export class LocalStorageClient<const Shapes extends Readonly<BaseLocalStorageClientShapes>> {
    /** Internal listen target used for `.listen()`. */
    private listenTarget: ListenTarget<any> = new ListenTarget<LocalStorageClientAllValuesEvent>();
    private keyEvents: Record<keyof Shapes, Constructor<CustomEvent>>;

    /**
     * The type for all values. Cannot be accessed as a value at runtime, only meant to be used as a
     * type.
     */
    public get AllValuesType(): LocalStorageClientAllValues<Shapes> {
        throw new Error('Cannot use AllValuesType as a runtime value. It is a type only.');
    }

    /**
     * The type for each value. Cannot be accessed as a value at runtime, only meant to be used as a
     * type.
     */
    public get ValueType(): RequiredAndNotNull<LocalStorageClientAllValues<Shapes>> {
        throw new Error('Cannot use ValueType as a runtime value. It is a type only.');
    }

    constructor(
        protected readonly shapes: Readonly<Shapes>,
        protected readonly options: Readonly<PartialWithUndefined<LocalStorageClientOptions>> = {},
    ) {
        this.storeName = options.storeName || 'local-storage-client';

        this.keyEvents = mapObjectValues(shapes, (key) => {
            return class extends defineTypedCustomEvent<any>()(
                `local-storage-client-${String(key)}-event`,
            ) {};
        });

        this.get = mapObjectValues(this.shapes, (key) => {
            return (options: LocalStorageClientGetOptions | undefined = {}) => {
                return this.getAllValues(options)[key];
            };
        });

        this.listen = mapObjectValues(this.shapes, (key) => {
            return (callback: (value: any) => MaybePromise<void>) => {
                return this.listenTarget.listen(this.keyEvents[key], async (event) => {
                    await callback(event.detail);
                });
            };
        });

        this.set = mapObjectValues(this.shapes, (key) => {
            return (newValue) => {
                assertValidShape(
                    newValue,
                    this.shapes[key],
                    {allowExtraKeys: true},
                    `LocalStorageClient: Invalid value for key '${String(key)}'.`,
                );
                const allValues = this.getAllValues();
                allValues[key] = newValue;

                globalThis.localStorage.setItem(this.storeName, JSON.stringify(allValues));
                this.listenTarget.dispatch(
                    new LocalStorageClientAllValuesEvent({detail: allValues}),
                );
                // eslint-disable-next-line sonarjs/new-operator-misuse
                this.listenTarget.dispatch(new this.keyEvents[key]({detail: newValue}));
                return newValue;
            };
        });

        this.delete = mapObjectValues(this.shapes, (key) => {
            return () => {
                const allValues = this.getAllValues();
                delete allValues[key];

                globalThis.localStorage.setItem(this.storeName, JSON.stringify(allValues));
                this.listenTarget.dispatch(
                    new LocalStorageClientAllValuesEvent({detail: allValues}),
                );
                // eslint-disable-next-line sonarjs/new-operator-misuse
                this.listenTarget.dispatch(new this.keyEvents[key]({detail: undefined}));
            };
        });
    }

    public readonly storeName: string;

    /**
     * Get all current values. Any values that have not been set or that are invalid will not be
     * present.
     *
     * @throws If `throwErrorOnFailure` is set and JSON cannot be parsed or a value does not match
     *   its shape.
     */
    public getAllValues({
        throwErrorOnFailure = false,
    }: LocalStorageClientGetOptions = {}): LocalStorageClientAllValues<Shapes> {
        return wrapInTry(
            () => {
                const rawValues = JSON.parse(
                    globalThis.localStorage.getItem(this.storeName) || '{}',
                );

                return mapObject(rawValues, (key, value) => {
                    const shapeDefinition = (
                        this.shapes satisfies Record<PropertyKey, Shape> as Record<
                            PropertyKey,
                            Shape
                        >
                    )[key];
                    if (!shapeDefinition) {
                        return undefined;
                    }

                    if (throwErrorOnFailure) {
                        assertValidShape(value, shapeDefinition, {allowExtraKeys: true});
                    } else if (!checkValidShape(value, shapeDefinition, {allowExtraKeys: true})) {
                        return undefined;
                    }

                    return {
                        key,
                        value,
                    };
                }) satisfies Partial<
                    Record<keyof Shapes, any>
                > as LocalStorageClientAllValues<Shapes>;
            },
            {
                handleError: (error) => {
                    if (throwErrorOnFailure) {
                        throw ensureErrorAndPrependMessage(
                            error,
                            `LocalStorageClient: store '${this.storeName}' is corrupt and cannot be loaded.`,
                        );
                    } else {
                        return {};
                    }
                },
            },
        );
    }

    /**
     * Listen to `.set` calls.
     *
     * @returns A callback to remove the attached listener.
     */
    public listenToAllValues(
        callback: (allValues: LocalStorageClientAllValues<Shapes>) => MaybePromise<void>,
    ) {
        return this.listenTarget.listen(LocalStorageClientAllValuesEvent, async (event) => {
            await callback(event.detail);
        });
    }

    /**
     * Listen to changes on the specific key. The callback's parameter will be `undefined` if the
     * value has been deleted.
     */
    public readonly listen: LocalStorageClientListen<Shapes>;

    /** Gets a specific value by key. This will return `undefined` if the */
    public readonly get: LocalStorageClientGet<Shapes>;
    /**
     * Set a specific value by key.
     *
     * @throws If the given data does not match the defined shape for it.
     */
    public readonly set: LocalStorageClientSet<Shapes>;
    /** Delete a specific value by key. */
    public readonly delete: LocalStorageClientDelete<Shapes>;

    /** Clear all values. */
    public clear() {
        globalThis.localStorage.removeItem(this.storeName);
    }

    /** Cleanup the client and free-up resources. */
    public destroy() {
        this.listenTarget.destroy();
    }
}
