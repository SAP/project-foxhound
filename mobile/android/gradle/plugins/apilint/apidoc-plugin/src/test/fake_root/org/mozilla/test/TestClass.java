/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.test;

import java.util.List;
import android.support.annotation.NonNull;
import androidx.annotation.Nullable;

/** Test class used in ApiDocletTest */
public class TestClass {
    public String testFieldWithoutValue;
    public String testFieldWithValue = "testValue";

    public final String testFinalField = "finalValue";
    public final static String testFinalStaticField = "finalStaticValue";

    public final static List<String> TEST_COMPOSITE_TYPE = null;
    public final static List<List<String>> TEST_NESTED_COMPOSITE_TYPE = null;

    public @A @B @C int testSorting1;
    public @B @A @C int testSorting2;
    public @C @B @A int testSorting3;

    public void testAnnotationSorting1(@A @B @C int test);
    public void testAnnotationSorting2(@B @A @C int test);
    public void testAnnotationSorting3(@C @B @A int test);

    protected int testProtectedField;
    int testPackageProtectedField;

    public class TestSubclass {}
    public abstract class TestExtendGeneric implements List<TestClass> {}
    public static class TestStaticSubclass {}
    public abstract class TestAbstractClass {}
    public interface TestInterface {
        void testInterfaceMethod();
        public static class TestSubInterfaceClass {
            private TestSubInterfaceClass() {}
            public interface TestSubClassInterface {
            }
        }
    }
    public interface TestDefaultInterface {
        default void testInterfaceMethod() {}
    }
    public interface TestInterfaceTwo {}

    public final void testMethodAnnotation(@NonNull String nonNullParam) {}
    public final void testMultipleMethodAnnotation(@NonNull String nonNullParam1, @NonNull String nonNullParam2) {}
    public final @NonNull String testReturnTypeAnnotation() {}

    public static class TestInterfaceImpl implements TestInterface {
        public void testInterfaceMethod() {}
    }
    public static class TestMultipleInterfaceImpl implements TestInterface, TestInterfaceTwo {
        public void testInterfaceMethod() {}
    }
    public static class TestExtends extends TestInterfaceImpl {
        // Override methods should not appear
        @Override
        @NonNull
        public String toString() {
            return "";
        }
    }
    public static class TestExtendsImplements extends TestSubclass implements TestInterface, TestInterfaceTwo {}

    public static class TestSkippedClass {}
    public static class TestSkippedClass2 {}

    @Deprecated
    @DeprecationSchedule(id="test-deprecation", version=2)
    public static class TestAnnotationBase {
        private TestAnnotationBase() {}

        @Deprecated
        public void methodToOverride() {}

        public void methodToOverrideWithArgAnnotation(@NonNull String arg) {}

        public void methodToOverrideWithArgAnnotation2(@Nullable String arg) {}
    }

    public static class TestAnnotationChildShouldHaveAnnotation extends TestAnnotationBase {
        private TestAnnotationChildShouldHaveAnnotation() {}

        @Override
        public void methodToOverride() {}

        // NOTE: Missing @NonNull but still @Override
        @Override
        public void methodToOverrideWithArgAnnotation(String arg) {}

        // NOTE: Not @Override
        public void methodToOverride(int overload) {}
    }

    @Deprecated
    public static class TestAnnotationChildDuplicateAnnotation extends TestAnnotationBase {
        private TestAnnotationChildDuplicateAnnotation() {}

        @Override
        @Deprecated
        public void methodToOverride() {}
    }

    public TestClass() {}
    public TestClass(String arg1) {}
    public TestClass(String arg1, int arg2) {}
    protected TestClass (boolean arg) {}
    TestClass(int arg) {}

    @Deprecated
    public class DeprecatedClass {}
    @SuppressWarnings("")
    public class HiddenAnnotationClass {}

    public void testVoidMethod() {}
    public String testStringMethod() { return null; }

    public void testVoidMethodWithArg(String arg) {}
    public String testStringMethodWithArg(String arg) { return null; }

    public synchronized void testSynchronized() {}
    public static void testStatic() {}
    public final void testFinal() {}

    public void testVarArgsOneArg(int ... var1) {}
    public void testVarArgsTwoArgs(int var0, int ... var1) {}

    public void testArrayArg(int[] var) {}

    public void testFinalArg(final int arg) {}

    protected void testProtectedMethod() {}
    void testPackageProtectedMethod() {}

    @Deprecated
    public void testAnnotation() {}
    @Deprecated
    public TestClass(float arg) {}
    @Deprecated
    public final static int TEST_DEPRECATED_CONST = 1;

    @SuppressWarnings("")
    public void testHiddenAnnotation() {}
    @SuppressWarnings("")
    public TestClass(int arg0, float arg1) {}
    @SuppressWarnings("")
    public final static int TEST_HIDDEN_ANNOTATION = 2;

    public @interface TestAnnotation {}

    public <T> void testTypeVariableUnbounded(T arg) {}
    public <T extends java.lang.Runnable> void testTypeVariableWithBounds(T arg) {}
    public <T extends java.lang.Runnable & java.lang.Cloneable> void testTypeVariableWithMultipleBounds(T arg) {}
    public <T extends java.util.Map<Integer, Long>> void testTypeVariableWithMapBounds(T arg) {}

    public <T> T testReturnTypeUnbounded() { return null; }
    public <T extends java.lang.Runnable> T testReturnTypeWithBound() { return null; }

    public <T> List<List<T>> testReturnNestedCompositeType() { return null; }
    public <T> void testParamNestedCompositeType(List<List<T>> arg) {}

    public <T> List<T> testReturnCompositeType() { return null; }
    public <T> void testCompositeParam(List<T> arg) {}

    public static class TestTypeVariable<T> {
        public void testTypeVariableMethod(T arg);
    }

    public static class TestTypeBoundVariable<T extends java.lang.Runnable> {
        public void testTypeVariableMethod(T arg);
    }

    public static interface TestInterfaceTypeVariable<T> {
        public void testTypeVariableMethod(T arg);
    }

    public static enum TestEnum {
        TestEnumConstantOne,
        TestEnumConstantTwo,
    }

    // Test that imports don't confuse classes with same name
    public static org.mozilla.test.testsorta.TestSort sort1;
    public static org.mozilla.test.testsortb.TestSort sort2;

    public static class TestSort {
        private TestSort() {}

        // Test sorting fields by name
        public final static int TEST_SORT_C = 1;
        public final static int TEST_SORT_A = 2;
        public final static int TEST_SORT_D = 3;
        public final static int TEST_SORT_B = 4;

        // Test sorting methods by name
        public void testSortD0();
        public void testSortA0();
        public void testSortC0();
        public void testSortB0();

        // Test that protected methods come after public
        protected void testSortD1();
        protected void testSortA1();
        protected void testSortC1();
        protected void testSortB1();

        // Test sorting classes by name
        public static class TestSortA {
            private TestSortA() {}
        }
        public static class TestSortD {
            private TestSortD() {}
        }
        public static class TestSortB {
            private TestSortB() {}
        }
        public static class TestSortC {
            private TestSortC() {}
        }
    }

    public static final int TEST_INT = 1;
    public static final long TEST_LONG = 2;
    public static final double TEST_DOUBLE = 2.0;

    public static class TestPackageProtected {
        private TestPackageProtected() {}
        // This shouldn't appear in the API
        /* package */ void testPackageProtected();
    }

    public static class TestOverrideNonVisibleApi extends TestPackageProtected {
        private TestOverrideNonVisibleApi() {}
        // This should appear in the API
        @Override
        public void testPackageProtected();
    }

}
