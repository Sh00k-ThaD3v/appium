import pluralize from 'pluralize';
import {Comment, DeclarationReflection, ParameterReflection, SignatureReflection} from 'typedoc';
import {
  CommandMethodDeclarationReflection,
  CommentSourceType,
  Example,
  extractExamples,
} from '../../converter';
import {isExecMethodData} from '../../guards';
import {AppiumPluginLogger} from '../../logger';
import {CommandData, ExecMethodData} from '../command-data';
import {AllowedHttpMethod, Route} from '../types';
import {ExtensionReflection} from './extension';
import {AppiumPluginReflectionKind} from './kind';
/**
 * Execute Methods all have the same route.
 */
export const NAME_EXECUTE_ROUTE = '/session/:sessionId/execute';

/**
 * Execute methods all have the same HTTP method.
 */
export const HTTP_METHOD_EXECUTE = 'POST';

/**
 * A reflection containing data about a single command or execute method.
 *
 * Methods may be invoked directly by Handlebars templates.
 */
export class CommandReflection extends DeclarationReflection {
  /**
   * HTTP Method of the command or execute method
   */
  public readonly httpMethod: string;

  /**
   * Optional parameters, if any
   */
  public readonly optionalParams: string[];

  /**
   * Required parameters, if any
   */
  public readonly requiredParams: string[];

  /**
   * Route name
   */
  public readonly route: Route;

  /**
   * Script name, if any. Only used if kind is `EXECUTE_METHOD`
   */
  public readonly script?: string;

  /**
   * Comment, if any.
   */
  public readonly comment?: Comment;

  /**
   * Metadata about where `comment` came from
   */
  public readonly commentSource?: CommentSourceType;
  /**
   * Original method declaration
   */
  public readonly refl?: CommandMethodDeclarationReflection;

  /**
   * Parameters for template display
   */
  public readonly parameters?: ParameterReflection[];

  /**
   * Call signature for template display
   */
  public readonly signature?: SignatureReflection;

  public readonly examples?: Example[];

  #log: AppiumPluginLogger;

  /**
   * Sets props depending on type of `data`
   * @param data Command or execute method data
   * @param parent Always a {@linkcode ExtensionReflection}
   * @param route Route, if not an execute method
   */
  constructor(
    readonly data: CommandData | ExecMethodData,
    parent: ExtensionReflection,
    log: AppiumPluginLogger,
    route?: Route
  ) {
    let name: string;
    let kind: AppiumPluginReflectionKind;
    let script: string | undefined;
    let httpMethod: AllowedHttpMethod;

    // common data
    const {
      requiredParams,
      optionalParams,
      comment,
      methodRefl: refl,
      commentSource,
      parameters,
      signature,
      command,
    } = data;

    // kind-specific data
    if (isExecMethodData(data)) {
      script = name = data.script;
      kind = AppiumPluginReflectionKind.ExecuteMethod;
      route = NAME_EXECUTE_ROUTE;
      httpMethod = HTTP_METHOD_EXECUTE;
    } else {
      if (!route) {
        throw new TypeError('"route" arg is required for a non-execute-method command');
      }
      name = command;
      kind = AppiumPluginReflectionKind.Command;
      httpMethod = data.httpMethod;
    }

    super(name, kind as any, parent);

    this.#log = log;
    this.route = route;
    this.httpMethod = httpMethod;
    this.requiredParams = requiredParams ?? [];
    this.optionalParams = optionalParams ?? [];
    this.script = script;
    this.refl = refl;
    this.commentSource = commentSource;
    this.parameters = parameters;
    this.signature = signature;
    const extractedExamples = extractExamples(comment);
    if (extractedExamples?.examples?.length) {
      this.#log.verbose(
        'Extracted %s from comment in %s',
        pluralize('example', extractedExamples.examples.length, true),
        this.name
      );
    }
    this.examples = extractedExamples?.examples;
    this.comment = extractedExamples?.comment;
  }

  /**
   * If `true`, this command has required parameters
   *
   * Used by templates
   */
  public get hasRequiredParams(): boolean {
    return Boolean(this.requiredParams.length);
  }

  /**
   * If `true`, this command has optional parameters
   *
   * Used by templates
   */
  public get hasOptionalParams(): boolean {
    return Boolean(this.optionalParams.length);
  }

  /**
   * If `true`, this command contains data about an execute method
   *
   * Used by templates
   */
  public get isExecuteMethod(): boolean {
    return this.kindOf(AppiumPluginReflectionKind.ExecuteMethod as any);
  }

  /**
   * If `true`, this command contains one or more examples
   *
   * Used by templates
   */
  public get hasExample(): boolean {
    return Boolean(this.examples?.length);
  }
}
