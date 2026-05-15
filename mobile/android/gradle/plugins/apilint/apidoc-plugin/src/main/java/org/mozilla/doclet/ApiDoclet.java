/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.doclet;

import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.LineMap;
import com.sun.source.util.DocSourcePositions;
import com.sun.source.util.TreePath;
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.AnnotationMirror;
import javax.lang.model.element.AnnotationValue;
import javax.lang.model.element.Element;
import javax.lang.model.element.ElementKind;
import javax.lang.model.element.ExecutableElement;
import javax.lang.model.element.Modifier;
import javax.lang.model.element.PackageElement;
import javax.lang.model.element.Parameterizable;
import javax.lang.model.element.TypeElement;
import javax.lang.model.element.TypeParameterElement;
import javax.lang.model.element.VariableElement;
import javax.lang.model.type.ArrayType;
import javax.lang.model.type.DeclaredType;
import javax.lang.model.type.ErrorType;
import javax.lang.model.type.ExecutableType;
import javax.lang.model.type.IntersectionType;
import javax.lang.model.type.NoType;
import javax.lang.model.type.NullType;
import javax.lang.model.type.PrimitiveType;
import javax.lang.model.type.TypeKind;
import javax.lang.model.type.TypeMirror;
import javax.lang.model.type.TypeVariable;
import javax.lang.model.type.TypeVisitor;
import javax.lang.model.type.UnionType;
import javax.lang.model.type.WildcardType;
import jdk.javadoc.doclet.Doclet;
import jdk.javadoc.doclet.DocletEnvironment;
import jdk.javadoc.doclet.Reporter;

/** Generates API definition for a package using the javadoc Doclet API */
public class ApiDoclet implements Doclet {
  Reporter mReporter;

  @Override
  public void init(Locale locale, Reporter reporter) {
    mReporter = reporter;
  }

  @Override
  public String getName() {
    return "api-doc";
  }

  private Map<String, ApiDocOption> mOptions;

  @Override
  public Set<? extends Option> getSupportedOptions() {
    mOptions =
        Map.of(
            "output", new ApiDocOption("-output", "Output path for api-doc."),
            "doctitle", new ApiDocOption("-doctitle", "Doc title for api-doc."),
            "windowtitle", new ApiDocOption("-windowtitle", "Window title for api-doc."),
            "directory", new ApiDocOption("-d", "Directory for api-doc."),
            "subpackages", new ApiDocOption("-subpackages", "Packages for api-doc."),
            "skip-class-regex",
                new ApiDocOption("-skip-class-regex", "Skip class regex for api-doc."),
            "root-dir", new ApiDocOption("-root-dir", "Root dir for api-doc."));
    return new HashSet<>(mOptions.values());
  }

  @Override
  public SourceVersion getSupportedSourceVersion() {
    return SourceVersion.latest();
  }

  Options options;
  DocletEnvironment env;

  private Options buildOptions() {
    return new Options(
        mOptions.get("output").getValue(),
        List.of(mOptions.get("skip-class-regex").getValue().split(":")),
        mOptions.get("root-dir").getValue(),
        mOptions.get("subpackages").getValue());
  }

  @Override
  public boolean run(final DocletEnvironment docletEnvironment) {
    options = buildOptions();
    env = docletEnvironment;

    try {
      final Writer writer =
          new WriterImpl(
              env,
              new BufferedWriter(new FileWriter(options.outputFileName)),
              new BufferedWriter(new FileWriter(options.outputFileName + ".map")),
              options.rootDir + "/");

      docletEnvironment.getSpecifiedElements().stream()
          .sorted(ELEMENT_COMPARATOR)
          .filter(
              el -> {
                // Only select top-level packages
                if (el instanceof PackageElement p) {
                  return p.getEnclosingElement().getKind() == ElementKind.MODULE;
                }
                return false;
              })
          .map(el -> (PackageElement) el)
          .forEach(p -> writePackage(p, writer));

      writer.close();
      return true;
    } catch (IOException e) {
      System.err.println("Error: " + e.getMessage());
      return false;
    }
  }

  static class ApiDocOption implements Option {
    private String mValue;
    private final String mDescription;
    private final String mName;

    public ApiDocOption(final String name, final String description) {
      mName = name;
      mDescription = description;
    }

    public String getValue() {
      return mValue;
    }

    @Override
    public String getDescription() {
      return mDescription;
    }

    @Override
    public List<String> getNames() {
      return List.of(mName);
    }

    @Override
    public int getArgumentCount() {
      return 1;
    }

    @Override
    public Kind getKind() {
      return Kind.STANDARD;
    }

    @Override
    public String getParameters() {
      return "";
    }

    @Override
    public boolean process(String s, List<String> list) {
      mValue = list.get(0);
      return true;
    }
  }

  private static class Options {
    final String outputFileName;
    final List<Pattern> skipClasses;
    final String rootDir;
    final String rootPackage;

    public Options(
        String outputFileName, List<String> skipClassesRegex, String rootDir, String rootPackage) {
      this.outputFileName = outputFileName;
      this.skipClasses =
          skipClassesRegex.stream().map(Pattern::compile).collect(Collectors.toList());
      this.rootDir = rootDir;
      this.rootPackage = rootPackage;
    }
  }

  private void writePackage(PackageElement packageElement, Writer writer) {
    writer.line("package " + packageElement.getQualifiedName() + " {", packageElement);
    writer.newLine();

    packageElement.getEnclosedElements().stream()
        .sorted(ELEMENT_COMPARATOR)
        .forEach(
            e -> {
              if (e instanceof PackageElement pkg) {
                writePackage(pkg, writer.indent());
              } else if (e instanceof TypeElement classDoc) {
                writeClass(classDoc, writer.indent());
              }
            });

    writer.line("}");
    writer.newLine();
  }

  private static final Comparator<AnnotationMirror> ANNOTATION_DESC_COMPARATOR =
      new Comparator<>() {
        @Override
        public int compare(AnnotationMirror a, AnnotationMirror b) {
          return ELEMENT_COMPARATOR.compare(
              a.getAnnotationType().asElement(), b.getAnnotationType().asElement());
        }
      };

  private final Comparator<TypeMirror> TYPE_MIRROR_COMPARATOR =
      new Comparator<>() {
        @Override
        public int compare(TypeMirror t0, TypeMirror t1) {
          TypeElement a = (TypeElement) env.getTypeUtils().asElement(t0);
          TypeElement b = (TypeElement) env.getTypeUtils().asElement(t1);
          return a.getQualifiedName().toString().compareTo(b.getQualifiedName().toString());
        }
      };

  private static final Comparator<Element> ELEMENT_COMPARATOR =
      new Comparator<>() {
        @Override
        public int compare(Element a, Element b) {
          if (kindOrder(a) != kindOrder(b)) {
            return kindOrder(a) < kindOrder(b) ? -1 : 1;
          }

          // Sort public members before private methods
          if (isPublic(a) != isPublic(b)) {
            return isPublic(a) ? -1 : 1;
          }

          // Then protected members
          if (isProtected(a) != isProtected(b)) {
            return isProtected(b) ? -1 : 1;
          }

          // Otherwise sort by name
          return a.getSimpleName().toString().compareTo(b.getSimpleName().toString());
        }

        private int kindOrder(Element e) {
          return switch (e.getKind()) {
            case CONSTRUCTOR -> 0;
            case METHOD -> 1;
            case FIELD -> 2;
            default -> 3;
          };
        }
      };

  private static boolean isPublic(Element e) {
    return e.getModifiers().contains(Modifier.PUBLIC);
  }

  private static boolean isProtected(Element e) {
    return e.getModifiers().contains(Modifier.PROTECTED);
  }

  private String classNameFragment(TypeElement classDoc) {
    StringBuilder fragment = new StringBuilder(classDoc.getSimpleName().toString());
    Element enclosing = classDoc.getEnclosingElement();
    while (enclosing.getKind() == ElementKind.CLASS
        || enclosing.getKind() == ElementKind.INTERFACE) {
      fragment.insert(0, enclosing.getSimpleName() + ".");
      enclosing = enclosing.getEnclosingElement();
    }
    return fragment.toString();
  }

  private interface Visitor<T> {
    void visit(T object);
  }

  private void visitSupertypes(TypeMirror type, Visitor<TypeElement> visitor) {
    for (TypeMirror t : env.getTypeUtils().directSupertypes(type)) {
      TypeElement el = (TypeElement) env.getTypeUtils().asElement(t);
      if (el != null) {
        visitor.visit(el);
      }
      visitSupertypes(t, visitor);
    }
  }

  private String toLine(TypeElement classDoc, Writer writer) {
    List<AnnotationMirror> annotations = new ArrayList<>(classDoc.getAnnotationMirrors());
    visitSupertypes(classDoc.asType(), t -> annotations.addAll(t.getAnnotationMirrors()));

    StringBuilder classLine = new StringBuilder(annotationFragment(annotations.stream(), writer));
    for (Modifier modifier : classDoc.getModifiers()) {
      if (modifier == Modifier.ABSTRACT
          && (classDoc.getKind() == ElementKind.ANNOTATION_TYPE
              || classDoc.getKind() == ElementKind.INTERFACE)) {
        continue;
      }
      classLine.append(modifier.toString()).append(" ");
    }

    classLine.append(
        switch (classDoc.getKind()) {
          case INTERFACE, ANNOTATION_TYPE -> "interface ";
          case ENUM -> "enum ";
          default -> "class ";
        });

    classLine.append(classNameFragment(classDoc));

    String typeParams = typeParamsFragment(classDoc.getTypeParameters(), writer);
    classLine.append(typeParams);

    if (typeParams.equals("")) {
      classLine.append(" ");
    }

    if (classDoc.getSuperclass() != null
        // Ignore trivial superclass
        && !classDoc.getSuperclass().toString().equals("java.lang.Object")
        && classDoc.getSuperclass().getKind() != TypeKind.NONE
        && classDoc.getKind() != ElementKind.ENUM) {
      classLine
          .append("extends ")
          .append(typeFragment(classDoc.getSuperclass(), writer))
          .append(" ");
    }

    if (classDoc.getInterfaces().size() > 0 && classDoc.getKind() != ElementKind.ANNOTATION_TYPE) {
      classLine.append("implements ");
      classDoc.getInterfaces().stream()
          .sorted(TYPE_MIRROR_COMPARATOR)
          .map(t -> typeFragment(t, writer))
          .forEach(t -> classLine.append(t).append(" "));
    }

    classLine.append("{");
    return classLine.toString();
  }

  private void writeClass(TypeElement typeElement, Writer writer) {
    if (options.skipClasses.stream()
        .anyMatch(sk -> sk.matcher(typeElement.getQualifiedName()).find())) {
      return;
    }
    if (typeElement.getModifiers().stream()
        .noneMatch(m -> m == Modifier.PUBLIC || m == Modifier.PROTECTED)) {
      return;
    }

    writer.line(toLine(typeElement, writer), typeElement);

    Writer indented = writer.indent();
    typeElement.getEnclosedElements().stream()
        .sorted(ELEMENT_COMPARATOR)
        .filter(
            e ->
                e.getKind() == ElementKind.METHOD
                    || e.getKind() == ElementKind.ENUM_CONSTANT
                    || e.getKind() == ElementKind.CONSTRUCTOR
                    || e.getKind().isField())
        // Don't add @Override methods to the API
        .filter(
            m -> {
              // Always show the method if the visibility is upgraded
              // or there's no super method at all
              Element superMethod = findSuperMethod(m, writer);
              if (superMethod == null) {
                return true;
              }
              if (!isPublic(superMethod) && !isProtected(superMethod)) {
                return true;
              }
              return isPublic(m) && !isPublic(superMethod);
            })
        .filter(
            m ->
                m.getModifiers().stream()
                    .anyMatch(mod -> mod == Modifier.PUBLIC || mod == Modifier.PROTECTED))
        .forEach(p -> indented.line(toLine(p, writer), p));

    writer.line("}");
    writer.newLine();

    typeElement.getEnclosedElements().stream()
        .filter(
            e ->
                e.getKind() == ElementKind.CLASS
                    || e.getKind() == ElementKind.INTERFACE
                    || e.getKind() == ElementKind.ENUM
                    || e.getKind() == ElementKind.ANNOTATION_TYPE)
        .sorted(ELEMENT_COMPARATOR)
        .forEach(c -> writeClass((TypeElement) c, writer));
  }

  private boolean isDocumented(AnnotationMirror annotation) {
    return annotation.getAnnotationType().asElement().getAnnotationMirrors().stream()
        .anyMatch(a -> "java.lang.annotation.Documented".equals(a.getAnnotationType().toString()));
  }

  private Stream<String> from(Stream<? extends AnnotationMirror> annotations, Writer writer) {
    return annotations.filter(this::isDocumented).map(s -> annotation(s, writer));
  }

  private String annotationValues(
      Map<? extends ExecutableElement, ? extends AnnotationValue> valuePairs, Writer writer) {
    String fragment =
        valuePairs.entrySet().stream()
            .map(
                p ->
                    p.getKey().getSimpleName()
                        + "="
                        + p.getValue().accept(new AnnotationValueVisitor(), writer))
            .collect(Collectors.joining(","));
    if (fragment.equals("")) {
      return "";
    }
    return "(" + fragment + ")";
  }

  private String annotation(AnnotationMirror annotation, Writer writer) {
    return "@"
        + writer.import_(annotation.getAnnotationType().toString())
        + annotationValues(annotation.getElementValues(), writer);
  }

  private String annotationFragment(List<? extends AnnotationMirror> members, Writer writer) {
    Stream<? extends AnnotationMirror> stream = members.stream().sorted(ANNOTATION_DESC_COMPARATOR);
    return annotationFragment(stream, writer);
  }

  private String annotationFragment(Stream<? extends AnnotationMirror> annotations, Writer writer) {
    String fragment = from(annotations, writer).distinct().collect(Collectors.joining(" "));
    if (fragment.equals("")) {
      return "";
    }
    return fragment + " ";
  }

  private String tag(Element member) {
    if (member.getEnclosingElement().getKind() == ElementKind.ANNOTATION_TYPE) {
      return "element";
    }

    return switch (member.getKind()) {
      case CONSTRUCTOR -> "ctor";
      case METHOD -> "method";
      case FIELD -> "field";
      case ENUM_CONSTANT -> "enum_constant";
      case ANNOTATION_TYPE -> "element";
      default -> throw new IllegalArgumentException("Unexpected member: " + member.getKind());
    };
  }

  static class AnnotationValueVisitor
      implements javax.lang.model.element.AnnotationValueVisitor<String, Writer> {
    @Override
    public String visit(AnnotationValue annotationValue, Writer writer) {
      return annotationValue.toString();
    }

    @Override
    public String visitBoolean(boolean b, Writer writer) {
      return Boolean.toString(b);
    }

    @Override
    public String visitByte(byte b, Writer writer) {
      return Byte.toString(b);
    }

    @Override
    public String visitChar(char c, Writer writer) {
      return Character.toString(c);
    }

    @Override
    public String visitDouble(double v, Writer writer) {
      return Double.toString(v);
    }

    @Override
    public String visitFloat(float v, Writer writer) {
      return Float.toString(v);
    }

    @Override
    public String visitInt(int i, Writer writer) {
      return Integer.toString(i);
    }

    @Override
    public String visitLong(long l, Writer writer) {
      return Long.toString(l);
    }

    @Override
    public String visitShort(short i, Writer writer) {
      return Short.toString(i);
    }

    @Override
    public String visitString(String s, Writer writer) {
      return "\"" + s + "\"";
    }

    @Override
    public String visitType(TypeMirror typeMirror, Writer writer) {
      return typeMirror.toString();
    }

    @Override
    public String visitEnumConstant(VariableElement variableElement, Writer writer) {
      String typeName =
          writer.import_(
              ((TypeElement) variableElement.getEnclosingElement()).getQualifiedName().toString());
      return typeName + "." + variableElement.getSimpleName();
    }

    @Override
    public String visitAnnotation(AnnotationMirror annotationMirror, Writer writer) {
      return annotationMirror.toString();
    }

    @Override
    public String visitArray(List<? extends AnnotationValue> list, Writer writer) {
      return "{"
          + list.stream().map(v -> v.accept(this, writer)).collect(Collectors.joining(", "))
          + "}";
    }

    @Override
    public String visitUnknown(AnnotationValue annotationValue, Writer writer) {
      return annotationValue.toString();
    }
  }

  static class VisitorArguments {
    String postfix;
    Writer writer;

    public VisitorArguments(Writer writer) {
      this.writer = writer;
      postfix = "";
    }
  }

  private String typeFragment(TypeMirror typeMirror, Writer writer) {
    return typeMirror.accept(
        new TypeVisitor<>() {
          @Override
          public String visit(TypeMirror typeMirror, VisitorArguments arguments) {
            return typeMirror.toString() + arguments.postfix;
          }

          @Override
          public String visitPrimitive(PrimitiveType primitiveType, VisitorArguments arguments) {
            return primitiveType.toString() + arguments.postfix;
          }

          @Override
          public String visitNull(NullType nullType, VisitorArguments arguments) {
            return nullType.toString() + arguments.postfix;
          }

          @Override
          public String visitArray(ArrayType arrayType, VisitorArguments arguments) {
            arguments.postfix = "[]" + arguments.postfix;
            return arrayType.getComponentType().accept(this, arguments);
          }

          @Override
          public String visitDeclared(DeclaredType declaredType, VisitorArguments arguments) {
            if (declaredType.asElement() instanceof TypeElement) {
              return declaredTypeFragment(declaredType, arguments.writer) + arguments.postfix;
            }
            return declaredType + arguments.postfix;
          }

          @Override
          public String visitError(ErrorType errorType, VisitorArguments arguments) {
            return null;
          }

          @Override
          public String visitTypeVariable(TypeVariable typeVariable, VisitorArguments arguments) {
            return typeVariable + arguments.postfix;
          }

          @Override
          public String visitWildcard(WildcardType wildcardType, VisitorArguments arguments) {
            return wildcardType + arguments.postfix;
          }

          @Override
          public String visitExecutable(ExecutableType executableType, VisitorArguments arguments) {
            return null;
          }

          @Override
          public String visitNoType(NoType noType, VisitorArguments arguments) {
            return noType.toString() + arguments.postfix;
          }

          @Override
          public String visitUnknown(TypeMirror typeMirror, VisitorArguments arguments) {
            return typeMirror.toString() + arguments.postfix;
          }

          @Override
          public String visitUnion(UnionType unionType, VisitorArguments arguments) {
            throw new UnsupportedOperationException();
          }

          @Override
          public String visitIntersection(
              IntersectionType intersectionType, VisitorArguments arguments) {
            throw new UnsupportedOperationException();
          }
        },
        new VisitorArguments(writer));
  }

  private String declaredTypeFragment(DeclaredType type, Writer writer) {
    String typeArgs =
        type.getTypeArguments().stream()
            .map(a -> typeFragment(a, writer))
            .collect(Collectors.joining(","));

    String fragment =
        writer.import_(((TypeElement) type.asElement()).getQualifiedName().toString());

    if (!typeArgs.equals("")) {
      fragment += "<" + typeArgs + ">";
    }

    return fragment;
  }

  private String paramFragment(VariableElement parameter, Writer writer) {
    return annotationFragment(parameter.getAnnotationMirrors(), writer)
        + typeFragment(parameter.asType(), writer);
  }

  private String paramsFragment(ExecutableElement executable, Writer writer) {
    String fragment = "(";

    fragment +=
        executable.getParameters().stream()
            .map(p -> paramFragment(p, writer))
            .collect(Collectors.joining(", "));

    if (executable.isVarArgs()) {
      fragment = fragment.replaceAll("\\[]$", "...");
    }

    return fragment + ")";
  }

  private String valueFragment(VariableElement field) {
    if (field.getConstantValue() == null) {
      return "";
    }

    if (field.getConstantValue() instanceof String) {
      return " = \"" + field.getConstantValue() + "\"";
    }
    if (field.getConstantValue() instanceof Long) {
      return " = " + field.getConstantValue() + "L";
    }

    return " = " + field.getConstantValue();
  }

  private String typeParamFragment(TypeParameterElement typeVariable, Writer writer) {
    String bounds =
        typeVariable.getBounds().stream()
            // Ignore trivial bound
            .filter(t -> !t.toString().equals("java.lang.Object"))
            .map(t -> typeFragment(t, writer))
            .collect(Collectors.joining(" & "));
    String fragment = typeFragment(typeVariable.asType(), writer);
    if (bounds.length() > 0) {
      fragment += " extends " + bounds;
    }
    return fragment;
  }

  private String typeParamsFragment(
      List<? extends TypeParameterElement> typeVariables, Writer writer) {
    String parameters =
        typeVariables.stream()
            .map(tv -> typeParamFragment(tv, writer))
            .collect(Collectors.joining(","));

    if (parameters.equals("")) {
      return "";
    }

    return "<" + parameters + "> ";
  }

  private String typesFragment(ExecutableElement executable, Writer writer) {
    String fragment = "(";

    fragment +=
        executable.getParameters().stream()
            .map(t -> typeFragment(t.asType(), writer))
            .collect(Collectors.joining(", "));

    if (executable.isVarArgs()) {
      fragment = fragment.replaceAll("\\[]$", "...");
    }

    return fragment + ")";
  }

  private Element findSuperMethod(Element member, Writer writer) {
    if (!(member instanceof ExecutableElement)) {
      return null;
    }

    List<ExecutableElement> methods = new ArrayList<>();
    TypeElement typeElement = (TypeElement) member.getEnclosingElement();
    visitSupertypes(
        typeElement.asType(),
        t ->
            t.getEnclosedElements().stream()
                .filter(e -> e.getKind() == ElementKind.METHOD)
                .map(e -> (ExecutableElement) e)
                .forEach(methods::add));

    return methods.stream()
        .filter(m -> m.getSimpleName().toString().equals(member.getSimpleName().toString()))
        .filter(
            m -> typesFragment(m, writer).equals(typesFragment((ExecutableElement) member, writer)))
        .findFirst()
        .orElse(null);
  }

  private String toLine(Element member, Writer writer) {
    String line = tag(member) + " ";

    line += annotationFragment(member.getAnnotationMirrors(), writer);

    if (member instanceof ExecutableElement executable) {
      line += executable.isDefault() ? "default " : "";
    }

    if (member.getModifiers().size() != 0) {
      ElementKind parentKind = member.getEnclosingElement().getKind();
      boolean shouldSkipAbstract =
          parentKind == ElementKind.ANNOTATION_TYPE || parentKind == ElementKind.INTERFACE;
      line +=
          member.getModifiers().stream()
                  .filter(m -> !shouldSkipAbstract || m != Modifier.ABSTRACT)
                  .filter(m -> m != Modifier.DEFAULT)
                  .map(Modifier::toString)
                  .collect(Collectors.joining(" "))
              + " ";
    }

    if (member instanceof Parameterizable parameterizable) {
      line += typeParamsFragment(parameterizable.getTypeParameters(), writer);
    }

    if (member.getKind() == ElementKind.CONSTRUCTOR) {
      line += member.getEnclosingElement().getSimpleName();
    } else {
      if (member instanceof ExecutableElement executable) {
        line += (typeFragment(executable.getReturnType(), writer)) + " ";
      } else if (member instanceof VariableElement) {
        line += typeFragment(member.asType(), writer) + " ";
      }
      line += member.getSimpleName();
    }

    if (member instanceof ExecutableElement executable) {
      line += paramsFragment(executable, writer);
    }

    if (member instanceof VariableElement variable) {
      line += valueFragment(variable);
    }

    return line + ";";
  }

  public interface Writer {
    Writer indent();

    void newLine();

    void line(String text);

    void line(String text, Element position);

    void close();

    String import_(String path);
  }

  record SourcePosition(String fileName, long line, long column) {}

  private static class WriterImpl implements Writer {
    private final BufferedWriter mWriter;
    private final BufferedWriter mSourceMapWriter;
    private final int mIndentation;
    private final StringBuilder mStringBuilder;
    private final StringBuilder mSourceMap;
    private final Map<String, String> mImports;
    private final String mRootDir;
    private final DocletEnvironment mEnv;

    private static final String INDENTATION = "  ";

    public WriterImpl(
        DocletEnvironment env,
        BufferedWriter writer,
        BufferedWriter sourceMapWriter,
        String rootDir) {
      this(
          env,
          writer,
          sourceMapWriter,
          0,
          new StringBuilder(),
          new HashMap<>(),
          new StringBuilder(),
          rootDir);
    }

    private WriterImpl(
        DocletEnvironment env,
        BufferedWriter writer,
        BufferedWriter sourceMapWriter,
        int indentation,
        StringBuilder stringBuilder,
        Map<String, String> imports,
        StringBuilder sourceMap,
        String rootDir) {
      mEnv = env;
      mWriter = writer;
      mSourceMapWriter = sourceMapWriter;
      mIndentation = indentation;
      mStringBuilder = stringBuilder;
      mImports = imports;
      mSourceMap = sourceMap;
      mRootDir = rootDir;
    }

    public Writer indent() {
      return new WriterImpl(
          mEnv,
          mWriter,
          mSourceMapWriter,
          mIndentation + 1,
          mStringBuilder,
          mImports,
          mSourceMap,
          mRootDir);
    }

    public String import_(String path) {
      String[] split = path.split("\\.");
      if (split.length == 1) {
        // Primitive type, nothing to import
        return path;
      }

      int firstClassIndex = 1;
      while (firstClassIndex <= split.length
          && Character.isLowerCase(split[firstClassIndex - 1].charAt(0))) {
        firstClassIndex++;
      }

      String base = split[firstClassIndex - 1];
      String imported = String.join(".", Arrays.copyOfRange(split, 0, firstClassIndex));

      if (mImports.containsKey(base) && !mImports.get(base).equals(imported)) {
        // Conflicting import
        return path;
      }

      mImports.put(base, imported);
      return String.join(".", Arrays.copyOfRange(split, firstClassIndex - 1, split.length));
    }

    public void close() {
      // Number of lines in the header, that don't have a source map
      int headerSize = 0;
      try {
        List<String> imports = new ArrayList<>(mImports.values());
        Collections.sort(imports);

        for (String imported : imports) {
          mWriter.write("import ");
          mWriter.write(imported);
          mWriter.write(";\n");
          headerSize++;
        }

        if (mImports.values().size() > 0) {
          mWriter.write("\n");
          headerSize++;
        }

        mWriter.write(mStringBuilder.toString());
        mWriter.close();

        for (int i = 0; i < headerSize; i++) {
          mSourceMapWriter.write("\n");
        }

        mSourceMapWriter.write(mSourceMap.toString());
        mSourceMapWriter.close();
      } catch (IOException ex) {
        throw new RuntimeException(ex);
      }
    }

    public void newLine() {
      line("", 0, "");
    }

    public void line(String text) {
      line(text, mIndentation, "");
    }

    public String sourceInfo(Element source) {
      if (source == null) {
        return "";
      }

      final SourcePosition position = getSourcePosition(source);
      if (position == null) {
        return "";
      }

      final String relativePath = position.fileName.replace(mRootDir, "");
      return relativePath + ":" + position.line + ":" + position.column;
    }

    public SourcePosition getSourcePosition(Element e) {
      TreePath path = mEnv.getDocTrees().getPath(e);
      if (path == null) {
        return null;
      }
      CompilationUnitTree cu = path.getCompilationUnit();
      LineMap lineMap = cu.getLineMap();
      DocSourcePositions spos = mEnv.getDocTrees().getSourcePositions();
      long pos = spos.getStartPosition(cu, path.getLeaf());

      String fileName = cu.getSourceFile().getName();
      long line = lineMap.getLineNumber(pos);
      long column = lineMap.getColumnNumber(pos);
      return new SourcePosition(fileName, line, column);
    }

    public void line(String text, Element source) {
      line(text, mIndentation, sourceInfo(source));
    }

    private void line(String text, int indent, String source) {
      mStringBuilder.append(INDENTATION.repeat(Math.max(0, indent)));
      mStringBuilder.append(text).append("\n");
      mSourceMap.append(source).append("\n");
    }
  }
}
