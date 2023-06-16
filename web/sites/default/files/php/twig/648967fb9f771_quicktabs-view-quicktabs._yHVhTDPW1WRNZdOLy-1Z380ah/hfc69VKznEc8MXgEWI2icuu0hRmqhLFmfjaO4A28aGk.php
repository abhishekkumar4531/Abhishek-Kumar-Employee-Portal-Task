<?php

use Twig\Environment;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Extension\SandboxExtension;
use Twig\Markup;
use Twig\Sandbox\SecurityError;
use Twig\Sandbox\SecurityNotAllowedTagError;
use Twig\Sandbox\SecurityNotAllowedFilterError;
use Twig\Sandbox\SecurityNotAllowedFunctionError;
use Twig\Source;
use Twig\Template;

/* modules/contrib/quicktabs/templates/quicktabs-view-quicktabs.html.twig */
class __TwigTemplate_373c9c7a5741730745f9a97db1aa1054 extends Template
{
    private $source;
    private $macros = [];

    public function __construct(Environment $env)
    {
        parent::__construct($env);

        $this->source = $this->getSourceContext();

        $this->parent = false;

        $this->blocks = [
        ];
        $this->sandbox = $this->env->getExtension('\Twig\Extension\SandboxExtension');
        $this->checkSecurity();
    }

    protected function doDisplay(array $context, array $blocks = [])
    {
        $macros = $this->macros;
        // line 18
        echo "
";
        // line 19
        echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->extensions['Drupal\Core\Template\TwigExtension']->attachLibrary("quicktabs/quicktabs"), "html", null, true);
        echo "

";
        // line 21
        $context["last_index"] = (($context["total_rows"] ?? null) - 1);
        // line 22
        echo "
";
        // line 23
        if (($context["title"] ?? null)) {
            // line 24
            echo "  <h3>";
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["title"] ?? null), 24, $this->source), "html", null, true);
            echo "</h3>
";
        }
        // line 26
        $context['_parent'] = $context;
        $context['_seq'] = twig_ensure_traversable(($context["rows"] ?? null));
        foreach ($context['_seq'] as $context["key"] => $context["row"]) {
            // line 27
            echo "  ";
            if (twig_in_filter($context["key"], ($context["rows_with_tabs"] ?? null))) {
                // line 28
                echo "    ";
                echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["tabs"] ?? null), 28, $this->source), "html", null, true);
                echo "
    <div class=\"quicktabs-main\" id=\"quicktabs-container-";
                // line 29
                echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["quicktab_id"] ?? null), 29, $this->source), "html", null, true);
                echo "\">
  ";
            }
            // line 31
            echo "  ";
            if (twig_in_filter($context["key"], ($context["rows_with_page_starts"] ?? null))) {
                // line 32
                echo "    ";
                $context['_parent'] = $context;
                $context['_seq'] = twig_ensure_traversable(($context["rows_with_page_starts"] ?? null));
                foreach ($context['_seq'] as $context["page_key"] => $context["page"]) {
                    // line 33
                    echo "      ";
                    if (($context["key"] == $context["page"])) {
                        // line 34
                        echo "        <div class=\"quicktabs-tabpage";
                        echo $this->extensions['Drupal\Core\Template\TwigExtension']->renderVar(((($context["page_key"] > 0)) ? (" quicktabs-hide") : ("")));
                        echo "\" id=\"quicktabs-tabpage-";
                        echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["quicktab_id"] ?? null), 34, $this->source), "html", null, true);
                        echo "-";
                        echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed($context["page_key"], 34, $this->source), "html", null, true);
                        echo "\"> <!-- start of tbapage -->
        ";
                        // line 35
                        $context["page_number"] = $context["page_key"];
                        // line 36
                        echo "      ";
                    }
                    // line 37
                    echo "    ";
                }
                $_parent = $context['_parent'];
                unset($context['_seq'], $context['_iterated'], $context['page_key'], $context['page'], $context['_parent'], $context['loop']);
                $context = array_intersect_key($context, $_parent) + $_parent;
                // line 38
                echo "  ";
            }
            // line 39
            echo "  ";
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, $context["row"], "content", [], "any", false, false, true, 39), 39, $this->source), "html", null, true);
            echo "
  ";
            // line 40
            if (twig_in_filter($context["key"], ($context["rows_with_page_endings"] ?? null))) {
                // line 41
                echo "    ";
                // line 42
                echo "    </div> 
  ";
            }
            // line 44
            echo "  ";
            if (($context["key"] == ($context["last_index"] ?? null))) {
                // line 45
                echo "    ";
                // line 46
                echo "    </div> 
  ";
            }
        }
        $_parent = $context['_parent'];
        unset($context['_seq'], $context['_iterated'], $context['key'], $context['row'], $context['_parent'], $context['loop']);
        $context = array_intersect_key($context, $_parent) + $_parent;
    }

    public function getTemplateName()
    {
        return "modules/contrib/quicktabs/templates/quicktabs-view-quicktabs.html.twig";
    }

    public function isTraitable()
    {
        return false;
    }

    public function getDebugInfo()
    {
        return array (  129 => 46,  127 => 45,  124 => 44,  120 => 42,  118 => 41,  116 => 40,  111 => 39,  108 => 38,  102 => 37,  99 => 36,  97 => 35,  88 => 34,  85 => 33,  80 => 32,  77 => 31,  72 => 29,  67 => 28,  64 => 27,  60 => 26,  54 => 24,  52 => 23,  49 => 22,  47 => 21,  42 => 19,  39 => 18,);
    }

    public function getSourceContext()
    {
        return new Source("", "modules/contrib/quicktabs/templates/quicktabs-view-quicktabs.html.twig", "/var/www/task/employee/root/web/modules/contrib/quicktabs/templates/quicktabs-view-quicktabs.html.twig");
    }
    
    public function checkSecurity()
    {
        static $tags = array("set" => 21, "if" => 23, "for" => 26);
        static $filters = array("escape" => 19);
        static $functions = array("attach_library" => 19);

        try {
            $this->sandbox->checkSecurity(
                ['set', 'if', 'for'],
                ['escape'],
                ['attach_library']
            );
        } catch (SecurityError $e) {
            $e->setSourceContext($this->source);

            if ($e instanceof SecurityNotAllowedTagError && isset($tags[$e->getTagName()])) {
                $e->setTemplateLine($tags[$e->getTagName()]);
            } elseif ($e instanceof SecurityNotAllowedFilterError && isset($filters[$e->getFilterName()])) {
                $e->setTemplateLine($filters[$e->getFilterName()]);
            } elseif ($e instanceof SecurityNotAllowedFunctionError && isset($functions[$e->getFunctionName()])) {
                $e->setTemplateLine($functions[$e->getFunctionName()]);
            }

            throw $e;
        }

    }
}
