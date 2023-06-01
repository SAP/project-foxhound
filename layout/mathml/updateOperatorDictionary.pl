#!/usr/bin/perl
# -*- Mode: Perl; tab-width: 2; indent-tabs-mode: nil; -*-
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

use XML::LibXSLT;
use XML::LibXML;
use LWP::Simple;

# output files
$FILE_UNICODE = "unicode.xml";
$FILE_DICTIONARY = "dictionary.xml";
$FILE_DIFFERENCES = "differences.txt";
$FILE_NEW_DICTIONARY = "new_dictionary.txt";
$FILE_SYNTAX_ERRORS = "syntax_errors.txt";

# our dictionary (property file)
$MOZ_DICTIONARY = "mathfont.properties";

# dictionary provided by the W3C in "XML Entity Definitions for Characters"
$WG_DICTIONARY_URL = "https://raw.githubusercontent.com/w3c/xml-entities/gh-pages/unicode.xml";

# XSL stylesheet to extract relevant data from the dictionary
$DICTIONARY_XSL = "operatorDictionary.xsl";

# dictionary provided by the W3C transformed with operatorDictionary.xsl 
$WG_DICTIONARY = $FILE_DICTIONARY;

if (!($#ARGV >= 0 &&
      ((($ARGV[0] eq "download") && $#ARGV <= 1) ||
       (($ARGV[0] eq "compare") && $#ARGV <= 1) ||
       (($ARGV[0] eq "check") && $#ARGV <= 0) ||
       (($ARGV[0] eq "clean") && $#ARGV <= 0)))) {
    &usage;
}

if ($ARGV[0] eq "download") {
    if ($#ARGV == 1) {
        $WG_DICTIONARY_URL = $ARGV[1];
    }
    print "Downloading $WG_DICTIONARY_URL...\n";
    getstore($WG_DICTIONARY_URL, $FILE_UNICODE);

    print "Converting $FILE_UNICODE into $FILE_DICTIONARY...\n";
    my $xslt = XML::LibXSLT->new();
    my $source = XML::LibXML->load_xml(location => $FILE_UNICODE);
    my $style_doc = XML::LibXML->load_xml(location => $DICTIONARY_XSL,
                                          no_cdata=>1);
    my $stylesheet = $xslt->parse_stylesheet($style_doc);
    my $results = $stylesheet->transform($source);
    open($file, ">$FILE_DICTIONARY") || die ("Couldn't open $FILE_DICTIONARY!");
    print $file $stylesheet->output_as_bytes($results);
    close($file);
    exit 0;
}

if ($ARGV[0] eq "clean") {
    unlink($FILE_UNICODE,
           $FILE_DICTIONARY,
           $FILE_DIFFERENCES,
           $FILE_NEW_DICTIONARY,
           $FILE_SYNTAX_ERRORS);
    exit 0;
}

if ($ARGV[0] eq "compare" && $#ARGV == 1) {
    $WG_DICTIONARY = $ARGV[1];
}

################################################################################
# structure of the dictionary used by this script:
# - key: same as in mathfont.properties
# - table:
#    index | value
#      0   | description
#      1   | lspace
#      2   | rspace
#      4   | largeop
#      5   | movablelimits
#      6   | stretchy
#      7   | separator
#      8   | accent
#      9   | fence
#     10   | symmetric
#     13   | direction

# 1) build %moz_hash from $MOZ_DICTIONARY

print "loading $MOZ_DICTIONARY...\n";
open($file, $MOZ_DICTIONARY) || die ("Couldn't open $MOZ_DICTIONARY!");

print "building dictionary...\n";
while (<$file>) {
    next unless (m/^operator\.(.*)$/);
    (m/^([\w|\.|\\]*)\s=\s(.*)\s#\s(.*)$/);

    # 1.1) build the key
    $key = $1;

    # 1.2) build the array
    $_ = $2;
    @value = ();
    $value[0] = $3;
    if (m/^(.*)lspace:(\d)(.*)$/) { $value[1] = $2; } else { $value[1] = "5"; }
    if (m/^(.*)rspace:(\d)(.*)$/) { $value[2] = $2; } else { $value[2] = "5"; }
    $value[4] = (m/^(.*)largeop(.*)$/);
    $value[5] = (m/^(.*)movablelimits(.*)$/);
    $value[6] = (m/^(.*)stretchy(.*)$/);
    $value[7] = (m/^(.*)separator(.*)$/);
    $value[8] = (m/^(.*)accent(.*)$/);
    $value[9] = (m/^(.*)fence(.*)$/);
    $value[10] = (m/^(.*)symmetric(.*)$/);
    if (m/^(.*)direction:([a-z]*)(.*)$/) { $value[13] = $2; }
    else { $value[13] = ""; }

    # 1.3) save the key and value
    $moz_hash{$key} = [ @value ];
}

close($file);

################################################################################
# 2) If mode "check", verify validity of our operator dictionary and quit.
#    If mode "compare", go to step 3)

if ($ARGV[0] eq "check") {
    print "checking operator dictionary...\n";
    open($file_syntax_errors, ">$FILE_SYNTAX_ERRORS") ||
        die ("Couldn't open $FILE_SYNTAX_ERRORS!");

    $nb_errors = 0;
    $nb_warnings = 0;
    @moz_keys = (keys %moz_hash);
    # check the validity of our private data
    while ($key = pop(@moz_keys)) {

        if ($key =~ /\\u.+\\u.+\\u.+/) {
            $valid = 0;
            $nb_errors++;
            print $file_syntax_errors "error: \"$key\" has more than 2 characters\n";
        }

        if ($key =~ /\\u20D2\./ || $key =~ /\\u0338\./) {
            $valid = 0;
            $nb_errors++;
            print $file_syntax_errors "error: \"$key\" ends with character U+20D2 or U+0338\n";
        }

        @moz = @{ $moz_hash{$key} };
        $entry = &generateEntry($key, @moz);
        $valid = 1;

        if (!(@moz[13] eq "" ||
              @moz[13] eq "horizontal" ||
              @moz[13] eq "vertical")) {
            $valid = 0;
            $nb_errors++;
            print $file_syntax_errors "error: invalid direction \"$moz[13]\"\n";
        }

        if (@moz[4] && !(@moz[13] eq "vertical")) {
            $valid = 0;
            $nb_errors++;
            print $file_syntax_errors "error: operator is largeop but does not have vertical direction\n";
        }
        
        if (!$valid) {
            print $file_syntax_errors $entry;
            print $file_syntax_errors "\n";
        }
    }

    # check that all forms have the same direction.
    @moz_keys = (keys %moz_hash);
    while ($key = pop(@moz_keys)) {

        if (@{ $moz_hash{$key} }) {
            # the operator has not been removed from the hash table yet.

            $_ = $key;
            (m/^([\w|\.|\\]*)\.(prefix|infix|postfix)$/);
            $key_prefix = "$1.prefix";
            $key_infix = "$1.infix";
            $key_postfix = "$1.postfix";
            @moz_prefix = @{ $moz_hash{$key_prefix} };
            @moz_infix = @{ $moz_hash{$key_infix} };
            @moz_postfix = @{ $moz_hash{$key_postfix} };

            $same_direction = 1;

            if (@moz_prefix) {
                if (@moz_infix &&
                    !($moz_infix[13] eq $moz_prefix[13])) {
                    $same_direction = 0;
                }
                if (@moz_postfix &&
                    !($moz_postfix[13] eq $moz_prefix[13])) {
                    $same_direction = 0;
                }
            }
            if (@moz_infix) {
                if (@moz_postfix &&
                    !($moz_postfix[13] eq $moz_infix[13])) {
                    $same_direction = 0;
                }
            }

            if (!$same_direction) {
                $nb_errors++;
                print  $file_syntax_errors
                    "error: operator has a stretchy form, but all forms";
                print  $file_syntax_errors
                    " have not the same direction\n";
                if (@moz_prefix) {
                    $_ = &generateEntry($key_prefix, @moz_prefix);
                    print $file_syntax_errors $_;
                }
                if (@moz_infix) {
                    $_ = &generateEntry($key_infix, @moz_infix);
                    print $file_syntax_errors $_;
                }
                if (@moz_postfix) {
                    $_ = &generateEntry($key_postfix, @moz_postfix);
                    print $file_syntax_errors $_;
                }
                print $file_syntax_errors "\n";
            }
            
            if (@moz_prefix) {
                delete $moz_hash{$key.prefix};
            }
            if (@moz_infix) {
                delete $moz_hash{$key_infix};
            }
            if (@moz_postfix) {
                delete $moz_hash{$key_postfix};
            }
        }
    }

    close($file_syntax_errors);
    print "\n";
    if ($nb_errors > 0 || $nb_warnings > 0) {
        print "$nb_errors error(s) found\n";
        print "$nb_warnings warning(s) found\n";
        print "See output file $FILE_SYNTAX_ERRORS.\n\n";
    } else {
        print "No error found.\n\n";
    }

    exit 0;
}

################################################################################
# 3) build %wg_hash and @wg_keys from the page $WG_DICTIONARY

print "loading $WG_DICTIONARY...\n";
my $parser = XML::LibXML->new();
my $doc = $parser->parse_file($WG_DICTIONARY);

print "building dictionary...\n";
@wg_keys = ();

foreach my $entry ($doc->findnodes('/root/entry')) {
    # 3.1) build the key
    $key = "operator.";

    $_ = $entry->getAttribute("unicode");

    # Skip non-BMP Arabic characters that are handled specially.
    if ($_ == "U1EEF0" || $_ == "U1EEF1") {
        next;
    }

    $_ = "$_-";
    while (m/^U?0(\w*)-(.*)$/) {
        # Concatenate .\uNNNN
        $key = "$key\\u$1";
        $_ = $2;
    }

    $_ = $entry->getAttribute("form"); # "Form"
    $key = "$key.$_";

    # 3.2) build the array
    @value = ();
    $value[0] = lc($entry->getAttribute("description"));
    $value[1] = $entry->getAttribute("lspace");
    if ($value[1] eq "") { $value[1] = "5"; }
    $value[2] = $entry->getAttribute("rspace");
    if ($value[2] eq "") { $value[2] = "5"; }

    $_ = $entry->getAttribute("properties");
    $value[4] = (m/^(.*)largeop(.*)$/);
    $value[5] = (m/^(.*)movablelimits(.*)$/);
    $value[6] = (m/^(.*)stretchy(.*)$/);
    $value[7] = (m/^(.*)separator(.*)$/);
    $value[9] = (m/^(.*)fence(.*)$/);
    $value[10] = (m/^(.*)symmetric(.*)$/);

    # not stored in the WG dictionary
    $value[8] = ""; # accent
    $value[13] = ""; # direction

    # 3.3) save the key and value
    push(@wg_keys, $key);
    $wg_hash{$key} = [ @value ];
}
@wg_keys = reverse(@wg_keys);

################################################################################
# 4) Compare the two dictionaries and output the result

print "comparing dictionaries...\n";
open($file_differences, ">$FILE_DIFFERENCES") ||
    die ("Couldn't open $FILE_DIFFERENCES!");
open($file_new_dictionary, ">$FILE_NEW_DICTIONARY") ||
    die ("Couldn't open $FILE_NEW_DICTIONARY!");

$conflicting = 0; $conflicting_stretching = 0;
$new = 0; $new_stretching = 0;
$obsolete = 0; $obsolete_stretching = 0;
$unchanged = 0;

# 4.1) look to the entries of the WG dictionary
while ($key = pop(@wg_keys)) {

    @wg = @{ $wg_hash{$key} };
    delete $wg_hash{$key};
    $wg_value = &generateCommon(@wg);

    if (exists($moz_hash{$key})) {
        # entry is in both dictionary
        @moz = @{ $moz_hash{$key} };
        delete $moz_hash{$key};
        $moz_value = &generateCommon(@moz);
        if ($moz_value ne $wg_value) {
            # conflicting entry
            print $file_differences "[conflict]";
            $conflicting++;
            if ($moz[6] != $wg[6]) {
                print $file_differences "[stretching]";
                $conflicting_stretching++;
            }
            print $file_differences " - $key ($wg[0])\n";
            print $file_differences "-$moz_value\n+$wg_value\n\n";
            $_ = &completeCommon($wg_value, $key, @moz, @wg);
            print $file_new_dictionary $_;
        } else {
            # unchanged entry
            $unchanged++;
            $_ = &completeCommon($wg_value, $key, @moz, @wg);
            print $file_new_dictionary $_;
        }
    } else {
        # we don't have this entry in our dictionary yet
        print $file_differences "[new entry]";
        $new++;
        if ($wg[6]) {
            print $file_differences "[stretching]";
            $new_stretching++;
        }
        print $file_differences " - $key ($wg[0])\n";
        print $file_differences "-\n+$wg_value\n\n";
        $_ = &completeCommon($wg_value, $key, (), @wg);
        print $file_new_dictionary $_;
    }
}

print $file_new_dictionary
    "\n# Entries below are not part of the official MathML dictionary\n\n";
# 4.2) look in our dictionary the remaining entries
@moz_keys = (keys %moz_hash);
@moz_keys = reverse(sort(@moz_keys));

while ($key = pop(@moz_keys)) {
    @moz = @{ $moz_hash{$key} };
    $moz_value = &generateCommon(@moz);
    print $file_differences "[obsolete entry]";
    $obsolete++;
    if ($moz[6]) {
        print $file_differences "[stretching]";
        $obsolete_stretching++;
    }
    print $file_differences " - $key ($moz[0])\n";
    print $file_differences "-$moz_value\n+\n\n";
    $_ = &completeCommon($moz_value, $key, (), @moz);
    print $file_new_dictionary $_;
}

close($file_differences);
close($file_new_dictionary);

print "\n";
print "- $obsolete obsolete entries ";
print "($obsolete_stretching of them are related to stretching)\n";
print "- $unchanged unchanged entries\n";
print "- $conflicting conflicting entries ";
print "($conflicting_stretching of them are related to stretching)\n";
print "- $new new entries ";
print "($new_stretching of them are related to stretching)\n";
print "\nSee output files $FILE_DIFFERENCES and $FILE_NEW_DICTIONARY.\n\n";
print "After having modified the dictionary, please run";
print "./updateOperatorDictionary check\n\n";
exit 0;

################################################################################
sub usage {
    # display the accepted command syntax and quit
    print "usage:\n";
    print "  ./updateOperatorDictionary.pl download [unicode.xml]\n";
    print "  ./updateOperatorDictionary.pl compare [dictionary.xml]\n";
    print "  ./updateOperatorDictionary.pl check\n";
    print "  ./updateOperatorDictionary.pl clean\n";
    exit 0;
}

sub generateCommon {
    # helper function to generate the string of data shared by both dictionaries
    my(@v) = @_;
    $entry = "lspace:$v[1] rspace:$v[2]";
    if ($v[4]) { $entry = "$entry largeop"; }
    if ($v[5]) { $entry = "$entry movablelimits"; }
    if ($v[6]) { $entry = "$entry stretchy"; }
    if ($v[7]) { $entry = "$entry separator"; }
    if ($v[9]) { $entry = "$entry fence"; }
    if ($v[10]) { $entry = "$entry symmetric"; }
    return $entry;
}

sub completeCommon {
    # helper to add key and private data to generateCommon
    my($entry, $key, @v_moz, @v_wg) = @_;
    
    $entry = "$key = $entry";

    if ($v_moz[8]) { $entry = "$entry accent"; }
    if ($v_moz[13]) { $entry = "$entry direction:$v_moz[13]"; }

    if ($v_moz[0]) {
        # keep our previous comment
        $entry = "$entry # $v_moz[0]";
    } else {
        # otherwise use the description given by the WG
        $entry = "$entry # $v_wg[0]";
    }

    $entry = "$entry\n";
    return $entry;
}

sub generateEntry {
    # helper function to generate an entry of our operator dictionary
    my($key, @moz) = @_;
    $entry = &generateCommon(@moz);
    $entry = &completeCommon($entry, $key, @moz, @moz);
    return $entry;
}
