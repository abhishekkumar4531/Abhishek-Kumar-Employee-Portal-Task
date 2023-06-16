## Menu Migration

### Introduction

The menu_migration module helps developers to import and export menu items
from one Drupal copy to another one. This was built quickly for a specific
project setup, so the options are limited, but it can be extended in the
future.

The functionality imports and exports one or more menu items per subsite,
so it works with multisite, but most probably it doesn't work with
multilingual, and it only manages MenuLinkContent items.

### Requirements

There aren't any special requirements for this module, but you should be
aware that file permissions actions might be required on the server.

### Installation

Install as usual.

```shell
composer require drupal/menu_migration
drush en drupal/menu_migration
```

### Configuration

The menu items are exported as json in a folder on the server, defined in
the configuration form provided by the module.

1. Navigate to Configuration → Development → Menu Migration → Settings
2. By default, the export folder is set to ../config/menu_migration, but you can change it to any directory relative to DRUPAL_ROOT
3. When u save this form, you might get an error about permissions, so please make sure that the selected folder has write access for either apache user (if you plan to use the interface) or the shell user (if you plan to use drush), or both.
4. Navigate to Configuration → Development → Menu Migration → Export
5. Select one or more menus and click on export
6. The items are exported as json in: <export_folder>/sites/<site_name>/<menu_name>/<menu_name>.json
7. To import, navigate to Configuration → Development → Import
8. Select one or more menus and click on import
9. When importing, all MenuLinkContent items that exist in the target menu(s) will be deleted prior to import

### Automation

Menu migration provides two drush commands for managing imports and exports.
You can import one or more menus at a time. If you want to import more than one,
the menu names need to be separated by commas.

Examples:
```shell
# Export "main" menu.
drush menu_migration:export main
# Export "main", "footer" menus
drush menu_migration:export main,footer
# Alias for export "main" menu.
drush mme main

# Import "main" menu.
drush menu_migration:import main
# Import "main", "footer" menus
drush menu_migration:import main,footer
# Alias for import "main" menu.
drush mmi main
```

### Troubleshooting

If you're getting errors that the menus can't be exported, please make
sure that the target directory has writing access by the server user that
is about to execute the exports.

### FAQ

TBD.
