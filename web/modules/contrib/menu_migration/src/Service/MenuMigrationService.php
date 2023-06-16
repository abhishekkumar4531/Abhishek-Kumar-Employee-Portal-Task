<?php

namespace Drupal\menu_migration\Service;

use Drupal\Core\Config\ImmutableConfig;
use Drupal\Component\Serialization\Json;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\DrupalKernel;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\File\FileSystemInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Drupal\Core\Menu\MenuLinkTreeInterface;
use Drupal\Core\Menu\MenuTreeParameters;
use Drupal\menu_link_content\Entity\MenuLinkContent;
use Drupal\menu_link_content\Plugin\Menu\MenuLinkContent as MenuLinkContentPlugin;
use Drupal\menu_migration\Form\SettingsForm;

/**
 * Service for managing menu items migrations.
 */
class MenuMigrationService {

  /**
   * The entity type manager service.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected EntityTypeManagerInterface $entityTypeManager;

  /**
   * The menu migration settings config.
   *
   * @var \Drupal\Core\Config\ImmutableConfig
   */
  protected ImmutableConfig $config;

  /**
   * The file system service.
   *
   * @var \Drupal\Core\File\FileSystemInterface
   */
  protected FileSystemInterface $fileSystem;

  /**
   * The menu link tree service.
   *
   * @var \Drupal\Core\Menu\MenuLinkTreeInterface
   */
  protected MenuLinkTreeInterface $menuTree;

  /**
   * The current request.
   *
   * @var \Symfony\Component\HttpFoundation\Request
   */
  protected $currentRequest;

  /**
   * Constructs a new menu items migration service.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entityTypeManager
   *   The entity type manager.
   * @param \Drupal\Core\Config\ConfigFactoryInterface $configFactory
   *   The config factory.
   * @param \Drupal\Core\File\FileSystemInterface $fileSystem
   *   The file system service.
   * @param \Drupal\Core\Menu\MenuLinkTreeInterface $menuLinkTree
   *   The menu tree service.
   * @param \Symfony\Component\HttpFoundation\RequestStack $request
   *   The request stack service.
   */
  public function __construct(EntityTypeManagerInterface $entityTypeManager, ConfigFactoryInterface $configFactory, FileSystemInterface $fileSystem, MenuLinkTreeInterface $menuLinkTree, RequestStack $request) {
    $this->entityTypeManager = $entityTypeManager;
    $this->config = $configFactory->get(SettingsForm::SETTINGS);
    $this->fileSystem = $fileSystem;
    $this->menuTree = $menuLinkTree;
    $this->currentRequest = $request->getCurrentRequest();
  }

  /**
   * Gets the available menus.
   *
   * @return array
   *   Returns the available menus as associative array, where the key is the ID
   *   and the value is the label.
   *
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   */
  public function getAvailableMenus() {
    $menus = [];
    $availableMenus = $this->entityTypeManager->getStorage('menu')->loadMultiple();
    foreach ($availableMenus as $menu) {
      $menus[$menu->id()] = $menu->label();
    }
    return $menus;
  }

  /**
   * Exports the menu link content items from the given menu to json.
   *
   * @param string $menuName
   *   The menu machine name.
   *
   * @return bool
   *   Returns TRUE if successful, FALSE otherwise.
   */
  public function exportMenu(string $menuName) {
    $directory = $this->getTargetDirectory($menuName);
    if (!$this->fileSystem->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS)) {
      return FALSE;
    }

    $bytes = file_put_contents("{$directory}/{$menuName}.json", Json::encode($this->getMenuTree($menuName)));
    return !empty($bytes);
  }

  /**
   * Imports the menu from the exported location.
   *
   * @param string $menuName
   *   The menu name.
   *
   * @return bool
   *   Returns TRUE if successful, FALSE otherwise.
   *
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   * @throws \Drupal\Core\Entity\EntityStorageException
   */
  public function importMenu(string $menuName) {
    // Delete existing items.
    $existingItems = $this->entityTypeManager->getStorage('menu_link_content')->loadByProperties(['menu_name' => $menuName]);
    foreach ($existingItems as $existingItem) {
      $existingItem->delete();
    }

    $directory = $this->getTargetDirectory($menuName);
    // @todo Check if we can read.
    if ($contents = file_get_contents("{$directory}/{$menuName}.json")) {
      $items = Json::decode($contents);
      $this->generateMenuItems($items);
      return TRUE;
    }
    return FALSE;
  }

  /**
   * Gets the target directory for the given menu name.
   *
   * @param string $menuName
   *   The menu name.
   *
   * @return string
   *   Returns the full path to the target directory.
   */
  public function getTargetDirectory($menuName) {
    $path = [
      DRUPAL_ROOT,
      $this->config->get('export_path'),
      DrupalKernel::findSitePath($this->currentRequest),
      $menuName,
    ];
    return implode('/', $path);
  }

  /**
   * Generates menu items and stores them in the database.
   *
   * @param array $sourceItems
   *   The hierarchy of menu items with Menu link content properties.
   * @param int|string $parent
   *   The menu link parent. Defaults to 0.
   *
   * @throws \Drupal\Core\Entity\EntityStorageException
   */
  protected function generateMenuItems(array $sourceItems, $parent = 0) {
    foreach ($sourceItems as $item) {
      $item['parent'] = $parent;
      $menuLinkContent = MenuLinkContent::create($item);
      $menuLinkContent->save();
      if (!empty($item['children'])) {
        $this->generateMenuItems($item['children'], "menu_link_content:{$menuLinkContent->uuid()}");
      }
    }
  }

  /**
   * Gets the menu tree for the given menu name.
   *
   * @param string $menuName
   *   The menu name.
   *
   * @return array
   *   Returns an array with the menu hierarchical structure.
   */
  protected function getMenuTree($menuName) {
    $parameters = new MenuTreeParameters();
    $tree = $this->menuTree->load($menuName, $parameters);
    $manipulators = [
      ['callable' => 'menu.default_tree_manipulators:generateIndexAndSort'],
    ];
    $tree = $this->menuTree->transform($tree, $manipulators);
    $processedTree = [];
    $this->processTree($tree, $processedTree);
    return $processedTree;
  }

  /**
   * Processes the given menu tree.
   *
   * Converts the given menu tree in a tree of hierarchical items, where each
   * item is a set of menu link properties.
   *
   * @param \Drupal\Core\Menu\MenuLinkTreeElement[] $tree
   *   The generated menu tree.
   * @param array $processedTree
   *   The resulted array.
   * @param int $delta
   *   The delta used for building the hierarchy.
   */
  protected function processTree(array &$tree, array &$processedTree, $delta = 0) {
    foreach ($tree as &$element) {
      $definition = $element->link->getPluginDefinition();
      if ($element->link instanceof MenuLinkContentPlugin) {
        // Unfortunately, we don't have access to the menu link content which
        // exists in the menu link content plugin, but it's protected.
        $menuLinkContent = $this->entityTypeManager->getStorage('menu_link_content')->load($definition['metadata']['entity_id']);
        $processedTree[$delta] = [
          'url' => $definition['url'],
          'title' => $definition['title'],
          'description' => $definition['description'],
          'options' => $definition['options'],
          'enabled' => $definition['enabled'],
          'expanded' => $definition['expanded'],
          'weight' => $definition['weight'],
          'menu_name' => $definition['menu_name'],
          'link' => $menuLinkContent->get('link')->getValue()[0],
        ];
        if ($element->hasChildren) {
          $processedTree[$delta]['children'] = [];
          $this->processTree($element->subtree, $processedTree[$delta]['children']);
        }
        $delta++;
      }
    }
  }

}
