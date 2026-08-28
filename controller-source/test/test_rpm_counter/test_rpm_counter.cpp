#include <unity.h>
#include "../../src/logic/RpmCounter.h"

void setUp(void) {}
void tearDown(void) {}

void test_starts_at_zero_rpm(void) {
    RpmCounter counter(4, 1000);
    TEST_ASSERT_EQUAL_FLOAT(0.0f, counter.rpm());
}

void test_ignores_a_repeated_reading_of_the_same_level(void) {
    // Two HIGH reads in a row (e.g. the sensor still sitting over the same
    // bar on the next poll) must count as one edge, not two -- otherwise a
    // slow-moving platter would read back as spinning faster than it is.
    RpmCounter counter(2, 1000);
    counter.update(true, 100);
    counter.update(true, 100); // repeated, must not count again
    counter.update(false, 150);
    counter.update(true, 200); // second real edge -> completes the 2-step cycle

    TEST_ASSERT_FLOAT_WITHIN(0.01f, 60000.0f / 200.0f, counter.rpm());
}

void test_computes_rpm_from_one_full_revolution(void) {
    RpmCounter counter(2, 1000);
    counter.update(true, 100);
    counter.update(false, 150);
    counter.update(true, 200); // 2nd rising edge completes the revolution

    // timeDiff spans from construction (t=0) to the edge that completes it.
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 300.0f, counter.rpm()); // 60000ms / 200ms
}

void test_recomputes_rpm_each_subsequent_revolution(void) {
    RpmCounter counter(2, 1000);
    counter.update(true, 100);
    counter.update(false, 150);
    counter.update(true, 200); // revolution 1: 60000/200 = 300rpm

    counter.update(false, 250);
    counter.update(true, 300);
    counter.update(false, 350);
    counter.update(true, 400); // revolution 2: another 200ms -> same rpm

    TEST_ASSERT_FLOAT_WITHIN(0.01f, 300.0f, counter.rpm());
}

void test_matches_production_config_at_45rpm(void) {
    // 24 bars/rev (the real BG4000-series/59xx-series config), spun at a
    // plausible 45rpm -> one revolution every 60000/45 = 1333.33ms, ~56ms
    // between each of the 24 edges.
    RpmCounter counter(24, 1000);
    unsigned long t = 0;
    for (int edge = 0; edge < 24; edge++) {
        t += 28;
        counter.update(true, t); // rising
        t += 28;
        counter.update(false, t); // falling
    }

    TEST_ASSERT_FLOAT_WITHIN(1.0f, 45.0f, counter.rpm());
}

void test_stalls_to_zero_after_timeout_with_no_edges(void) {
    RpmCounter counter(2, 500);
    counter.update(true, 100);
    counter.update(false, 150);
    counter.update(true, 200); // rpm now nonzero
    TEST_ASSERT_TRUE(counter.rpm() > 0.0f);

    counter.update(true, 800); // same level -- no new edge, just the clock advancing past the 500ms timeout (600ms since edge at 200)
    TEST_ASSERT_EQUAL_FLOAT(0.0f, counter.rpm());
}

void test_does_not_stall_within_the_timeout_window(void) {
    RpmCounter counter(2, 500);
    counter.update(true, 100);
    counter.update(false, 150);
    counter.update(true, 200);

    counter.update(true, 600); // same level -- only 400ms since the edge at 200, under the 500ms timeout
    TEST_ASSERT_TRUE(counter.rpm() > 0.0f);
}

int main(int argc, char **argv) {
    UNITY_BEGIN();
    RUN_TEST(test_starts_at_zero_rpm);
    RUN_TEST(test_ignores_a_repeated_reading_of_the_same_level);
    RUN_TEST(test_computes_rpm_from_one_full_revolution);
    RUN_TEST(test_recomputes_rpm_each_subsequent_revolution);
    RUN_TEST(test_matches_production_config_at_45rpm);
    RUN_TEST(test_stalls_to_zero_after_timeout_with_no_edges);
    RUN_TEST(test_does_not_stall_within_the_timeout_window);
    return UNITY_END();
}
