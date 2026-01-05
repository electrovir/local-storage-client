import {defineShape} from 'object-shape-tester';
import {LocalStorageClient} from './index.js';

const myClient = new LocalStorageClient({
    stringValue: defineShape(''),
    numberValue: defineShape(-1),
    booleanValue: defineShape(false),
    objectValue: defineShape({
        name: '',
        age: 0,
        location: '',
    }),
});

/** Set values with type safety. */
myClient.set.objectValue({
    age: 10,
    location: 'Earth',
    name: 'Example User',
});
myClient.set.booleanValue(true);

/** Delete a stored value. */
myClient.delete.booleanValue();

/** Get a stored value. If the stored value is not valid, `undefined` is returned. */
myClient.get.objectValue();
