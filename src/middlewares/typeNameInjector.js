"use strict";

/**
 * `typeNameInjector` middleware
 */

module.exports = (config, { strapi }) => {
  // Add your own logic here.
  return async (ctx, next) => {
    await next();
    const { route } = ctx.state;
    if (route) {
      if (route.info.type && route.info.type === "content-api") {
        // Strip the api:: off of the handler
        // api::test.test.find => [ 'api', 'test.test.find' ]
        const uidSplitPrefix = route.handler.split("::");

        // Break the handler into the main UID components and the actual handler
        // test.test.find => [ 'test', 'test', 'find' ]
        const uidSplitSuffix = uidSplitPrefix[1].split(".");

        // Reconstruct the UID
        // api::test.test
        const uid = `${uidSplitPrefix[0]}::${uidSplitSuffix[0]}.${uidSplitSuffix[1]}`;

        // Get the Schema
        const schema = strapi.contentTypes[uid].attributes;

        // Loop over the attributes and look for components
        Object.keys(schema).forEach((key) => {
          if (schema[key].type === "component") {
            // Get the component UID
            const componentUid = schema[key].component;

            // Only run on findMany requests
            if (uidSplitSuffix[2] === "find") {
              const data = ctx.response.body.data;

              // Loop over the data and add the component type
              if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                  const attributes = data[i].attributes;

                  // Check if the component is a repeatable or single
                  if (
                    attributes[key] &&
                    Array.isArray(attributes[key]) === true
                  ) {
                    attributes[key].forEach((item) => {
                      item.__component = componentUid;
                    });
                  } else if (attributes[key]) {
                    attributes[key].__component = componentUid;
                  }

                  // Check for 2nd level components
                  const componentSchema = strapi.components[componentUid].attributes;

                  // Loop over nested attributes and look for components
                  Object.keys(componentSchema).forEach((compoKey) => {
                    if (componentSchema[compoKey].type === "component") {
                      // Get the nested component UID
                      const nestedComponentUid = componentSchema[compoKey].component;

                      // Loop over the nested components and add the component type
                      for (let j = 0; j < attributes[key].length; j++) {
                        const nestedAttributes = attributes[key][j];

                        // Check if the component is a repeatable or single
                        if (
                          nestedAttributes[compoKey] &&
                          Array.isArray(nestedAttributes[compoKey]) === true
                        ) {
                          nestedAttributes[compoKey].forEach((item) => {
                            item.__component = nestedComponentUid;
                          });
                        } else if (nestedAttributes[compoKey]) {
                          nestedAttributes[compoKey].__component = nestedComponentUid;
                        }
                      }
                    }
                  })
                }
              }
            }
            // Run nested Compo within Dynamic Zone population
          } else if (schema[key].type === "dynamiczone") {
            // todo
          }
        });
      }
    }
  };
};
